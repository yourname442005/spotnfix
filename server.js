const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const { spawn } = require("child_process");
const fs = require("fs");

const { resolvePythonExecutable } = require("./lib/python");
const { hashPassword, isHashedPassword, verifyPassword } = require("./lib/passwords");
const {
  SESSION_COOKIE,
  parseCookies,
  sessionCookie,
  clearedSessionCookie,
  createSession,
  findSession,
  destroySession,
  ensureSessionIndex,
} = require("./lib/sessions");
const {
  STATUS,
  canonicalStatus,
  normalizeReport,
  transitionError,
  assignmentMetadata,
  resolutionMetadata,
} = require("./lib/reportLifecycle");

// Single source of truth for the database location (overridable for tests).
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sih_database";
const DB_NAME = (function resolveDbName(uri) {
  if (process.env.MONGO_DB_NAME) return process.env.MONGO_DB_NAME;
  try {
    const pathname = new URL(uri).pathname.replace(/^\//, "");
    return pathname || "sih_database";
  } catch (err) {
    return "sih_database";
  }
})(MONGO_URI);

// Strict ObjectId check: rejects 12-character strings that BSON would accept.
function isValidObjectId(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return /^[a-fA-F0-9]{24}$/.test(value);
  return mongoose.isValidObjectId(value);
}

function invalidIdResponse(res, label) {
  return res.status(400).json({ success: false, error: `Invalid ${label}` });
}

const app = express();
// `origin: true` reflects the caller (the previous `cors()` behaviour) while
// allowing cookies; CSRF is handled by SameSite=Lax on the session cookie.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ---- Session authentication -------------------------------------------------
// req.auth is ONLY ever populated here, from a server-side session record.
// Anything the client sends (adminId, dmId, userId) is untrusted input.
const isSecureCookie = process.env.NODE_ENV === "production";

function sessionsDb() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.client) {
    throw new Error("MongoDB is not connected");
  }
  return mongoose.connection.client.db(DB_NAME);
}

app.use(async function attachSession(req, res, next) {
  req.auth = null;
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) {
      const session = await findSession(sessionsDb(), token);
      if (session && session.user_id) {
        req.auth = {
          id: session.user_id,
          role: session.role,
          sessionId: session._id,
        };
      }
    }
  } catch (err) {
    // Fail closed: no readable session means no identity.
    req.auth = null;
  }
  next();
});

function requireAuth(...roles) {
  return function requireAuthMiddleware(req, res, next) {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    if (roles.length > 0 && !roles.includes(req.auth.role)) {
      return res.status(403).json({ success: false, error: "Forbidden for this role" });
    }
    next();
  };
}

/**
 * Validates a client-supplied identity field against the authenticated session.
 * Absent -> the session identity is used. Present -> it must be a well-formed ID
 * that exists in `collection` AND equal the session identity, otherwise the
 * request is rejected. Returns { ok: false } once a response has been sent.
 */
async function verifySuppliedIdentity(res, {
  supplied,
  authId,
  invalidLabel,
  unknownMessage,
  lookup,
}) {
  if (supplied === undefined || supplied === null || supplied === "") {
    return { ok: true, id: authId };
  }
  if (!isValidObjectId(supplied)) {
    invalidIdResponse(res, invalidLabel);
    return { ok: false };
  }
  const existing = await lookup(new mongoose.Types.ObjectId(String(supplied)));
  if (!existing) {
    res.status(400).json({ success: false, error: unknownMessage });
    return { ok: false };
  }
  if (String(supplied) !== String(authId)) {
    res.status(403).json({
      success: false,
      error: `${invalidLabel} does not match the authenticated session`,
    });
    return { ok: false };
  }
  return { ok: true, id: authId };
}

/**
 * Self-service profile guard: the path id must be well-formed and equal the
 * authenticated session identity (req.auth.id) — the URL is never trusted as
 * proof of identity. Returns false once a response has been sent.
 */
function requireOwnProfileId(res, pathId, authId, label) {
  if (!isValidObjectId(pathId)) {
    invalidIdResponse(res, label);
    return false;
  }
  if (String(pathId) !== String(authId)) {
    res.status(403).json({
      success: false,
      error: `${label} does not match the authenticated session`,
    });
    return false;
  }
  return true;
}
// ---------------------------------------------------------------------------

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image or video
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// ✅ MongoDB Connect
const mongoConnectionPromise = mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoConnectionPromise
.then(async () => {
  console.log("✅ Connected to MongoDB");
  // Best-effort TTL index; expiry is also enforced on every request.
  try {
    await ensureSessionIndex(sessionsDb());
  } catch (err) {
    console.error("⚠️ Could not ensure session TTL index:", err.message);
  }
})
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Serve static files for each portal
app.use("/admin", express.static(path.join(__dirname, "Admin/public")));
app.use("/dm", express.static(path.join(__dirname, "DM/public")));
app.use("/user", express.static(path.join(__dirname, "User/public")));
app.use("/landing", express.static(path.join(__dirname, "landing_page/public")));
app.use("/shared", express.static(path.join(__dirname, "shared")));

// ✅ Default route → landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "landing_page/public", "index.html"));
});

// ✅ Serve static files for User portal
app.use("/user", express.static(path.join(__dirname, "User/public")));

// ✅ Default User route → redirect to welcome_page.html
app.get("/user", (req, res) => {
  res.sendFile(path.join(__dirname, "User/public", "user_login.html"));
});

// ================= Admin Portal =================
app.use("/admin", express.static(path.join(__dirname, "Admin/public")));
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "Admin/public", "admin_login.html"));
});

// ================= DM (Executive) Portal =================
app.use("/dm", express.static(path.join(__dirname, "DM/public")));
app.get("/dm", (req, res) => {
  res.sendFile(path.join(__dirname, "DM/public", "executive_login.html"));
});


// ✅ Example Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String, // ✅ Add address field
  password: String, // ✅ Add password
});
const User = mongoose.model("User", UserSchema);


app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, phone, address, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    // ✅ Store bcrypt hashes for new users (legacy plaintext rows keep working)
    const hashedPassword = await hashPassword(password);
    const newUser = new User({ name, email, phone, address, password: hashedPassword });
    await newUser.save();
    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof password !== "string") {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Transparently upgrade legacy plaintext passwords on successful login.
    if (!isHashedPassword(user.password)) {
      user.password = await hashPassword(password);
      await user.save();
    }

    // ✅ Server-side session: opaque token in an HttpOnly cookie, digest in MongoDB
    const { token } = await createSession(sessionsDb(), { userId: user._id, role: "citizen" });
    res.setHeader("Set-Cookie", sessionCookie(token, { secure: isSecureCookie }));

    // Return user data along with success message
    res.json({ 
      success: true, 
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API endpoint to fetch user profile data
app.get("/api/user/profile/:userId", requireAuth("citizen"), async (req, res) => {
  try {
    const { userId } = req.params;
    if (!requireOwnProfileId(res, userId, req.auth.id, "user ID")) return;

    const user = await User.findById(req.auth.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API endpoint to update user profile
app.put("/api/user/profile/:userId", requireAuth("citizen"), async (req, res) => {
  try {
    const { userId } = req.params;
    if (!requireOwnProfileId(res, userId, req.auth.id, "user ID")) return;

    const { name, phone, email, address } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.auth.id,
      { name, phone, email, address },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API endpoint to fetch admin profile data
app.get("/api/admin/profile/:adminId", requireAuth("admin"), async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!requireOwnProfileId(res, adminId, req.auth.id, "admin ID")) return;

    const admin = await Admin.findById(req.auth.id);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    
    res.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        idNumber: admin.idNumber,
        address: admin.address
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API endpoint to update admin profile
app.put("/api/admin/profile/:adminId", requireAuth("admin"), async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!requireOwnProfileId(res, adminId, req.auth.id, "admin ID")) return;

    const { name, email, idNumber, address } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(
      req.auth.id,
      { name, email, idNumber, address },
      { new: true }
    );
    
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    
    res.json({
      success: true,
      message: "Admin profile updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        idNumber: admin.idNumber,
        address: admin.address
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API endpoint to fetch DM profile data
app.get("/api/dm/profile/:dmId", requireAuth("dm"), async (req, res) => {
  try {
    const { dmId } = req.params;
    if (!requireOwnProfileId(res, dmId, req.auth.id, "DM ID")) return;

    const dm = await DM.findById(req.auth.id);
    
    if (!dm) {
      return res.status(404).json({ success: false, message: "DM not found" });
    }
    
    res.json({
      success: true,
      dm: {
        id: dm._id,
        name: dm.name,
        email: dm.email,
        idNumber: dm.idNumber,
        address: dm.address
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API endpoint to update DM profile
app.put("/api/dm/profile/:dmId", requireAuth("dm"), async (req, res) => {
  try {
    const { dmId } = req.params;
    if (!requireOwnProfileId(res, dmId, req.auth.id, "DM ID")) return;

    const { name, email, idNumber, address } = req.body;
    
    const dm = await DM.findByIdAndUpdate(
      req.auth.id,
      { name, email, idNumber, address },
      { new: true }
    );
    
    if (!dm) {
      return res.status(404).json({ success: false, message: "DM not found" });
    }
    
    res.json({
      success: true,
      message: "DM profile updated successfully",
      dm: {
        id: dm._id,
        name: dm.name,
        email: dm.email,
        idNumber: dm.idNumber,
        address: dm.address
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= Admin Schema =================
// -------- Admin Schema --------
// Admin Schema
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  idNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);
const bcrypt = require("bcryptjs");

// Admin Register API
app.post("/api/admin/register", async (req, res) => {
  try {
    const { name, idNumber, email, address, password } = req.body;

    // ✅ Validate input
    if (!name || !idNumber || !email || !address || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already registered" });
    }

    // ✅ Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      idNumber,
      email,
      address,
      password: hashedPassword,
    });

    await newAdmin.save();

    res.status(201).json({ message: "✅ Admin registered successfully" });
  } catch (err) {
    console.error("❌ Error saving admin:", err);
    res.status(500).json({ message: err.message });
  }
});

// ================= Admin Login API =================
// ================= Admin Login API =================
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, msg: "Email and password required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ success: false, msg: "Invalid email or password" });
    }

    // ✅ Compare hashed password (legacy plaintext rows still accepted)
    const isMatch = await verifyPassword(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: "Invalid email or password" });
    }

    // ✅ If login success - return admin data
    const { token } = await createSession(sessionsDb(), { userId: admin._id, role: "admin" });
    res.setHeader("Set-Cookie", sessionCookie(token, { secure: isSecureCookie }));

    res.json({ 
      success: true, 
      msg: "Login successful",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        idNumber: admin.idNumber,
        address: admin.address
      }
    });

  } catch (err) {
    console.error("❌ Error in login:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

//==========DM SCHEMA ============//
const dmSchema = new mongoose.Schema({
  name: { type: String, required: true },
  idNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

const DM = mongoose.model("DM", dmSchema);

// ================= DM Register API =================
app.post("/api/dm/register", async (req, res) => {
  try {
    const { name, idNumber, email, address, password } = req.body;

    if (!name || !idNumber || !email || !address || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingDM = await DM.findOne({ email });
    if (existingDM) {
      return res.status(400).json({ message: "DM already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newDM = new DM({ name, idNumber, email, address, password: hashedPassword });
    await newDM.save();

    res.status(201).json({ message: "✅ DM registered successfully" });
  } catch (err) {
    console.error("❌ Error saving DM:", err);
    res.status(500).json({ message: err.message });
  }
});

//============= DM Login ========== //
// ================= DM Login API =================
app.post("/api/dm/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, msg: "Email and password required" });
    }

    const dm = await DM.findOne({ email });
    if (!dm) {
      return res.status(401).json({ success: false, msg: "Invalid email or password" });
    }

    const isMatch = await verifyPassword(password, dm.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: "Invalid email or password" });
    }

    const { token } = await createSession(sessionsDb(), { userId: dm._id, role: "dm" });
    res.setHeader("Set-Cookie", sessionCookie(token, { secure: isSecureCookie }));

    res.json({ 
      success: true, 
      msg: "✅ DM Login successful",
      dm: {
        id: dm._id,
        name: dm.name,
        email: dm.email,
        idNumber: dm.idNumber,
        address: dm.address
      }
    });

  } catch (err) {
    console.error("❌ Error in DM login:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});




// ================= Logout API =================
// Server-side invalidation: the session document is deleted, then the cookie is
// cleared. Idempotent, so a caller without a session still gets a clean 200.
app.post("/api/logout", async (req, res) => {
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) {
      await destroySession(sessionsDb(), token);
    }
    res.setHeader("Set-Cookie", clearedSessionCookie({ secure: isSecureCookie }));
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("Error in logout:", err);
    res.status(500).json({ success: false, error: "Logout failed" });
  }
});

// ================= Image Processing API =================
// API endpoint for image upload and processing
app.post("/api/upload-image", requireAuth("citizen"), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "No image file provided" 
      });
    }

    const { userId, issueTitle, issueCategory, issueLocation, issueDescription, reportingMethod } = req.body;

    // ✅ The report owner comes from the session, never from the request body
    const identity = await verifySuppliedIdentity(res, {
      supplied: userId,
      authId: req.auth.id,
      invalidLabel: "user ID",
      unknownMessage: "User not found",
      lookup: (id) => User.findById(id).select("_id"),
    });
    if (!identity.ok) {
      fs.unlinkSync(req.file.path);
      return;
    }
    const ownerId = String(req.auth.id);

    // ✅ Validate the referenced citizen before doing any processing
    const reportingUser = await User.findById(ownerId).select("_id");
    if (!reportingUser) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "User not found"
      });
    }

    // Prepare issue data
    const issueData = {
      title: issueTitle || "Untitled Issue",
      category: issueCategory || "Other",
      location: issueLocation || "Unknown Location",
      description: issueDescription || "No description provided",
      method: reportingMethod || "photo"
    };

    // Call Python script to process image (resolved per-platform: no `py` on macOS)
    let pythonExecutable;
    try {
      pythonExecutable = resolvePythonExecutable();
    } catch (pythonError) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({
        success: false,
        error: pythonError.message
      });
    }

    const pythonProcess = spawn(pythonExecutable, [
      path.join(__dirname, 'process.py'),
      req.file.path,
      ownerId,
      issueData.title,
      issueData.category,
      issueData.location,
      issueData.description
    ]);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      if (code !== 0) {
        console.error('Python process error:', error);
        return res.status(500).json({
          success: false,
          error: "Image processing failed: " + error
        });
      }

      try {
        const processResult = JSON.parse(result);
        
        if (processResult.success) {
          res.json({
            success: true,
            message: "Image processed and report submitted successfully",
            reportId: processResult.report_id,
            imageTimestamp: processResult.image_timestamp,
            gpsCoordinates: processResult.gps_coordinates
          });
        } else {
          res.status(400).json({
            success: false,
            error: processResult.error
          });
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        res.status(500).json({
          success: false,
          error: "Failed to parse processing result"
        });
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: "Upload failed: " + error.message
    });
  }
});

// API endpoint to store issue without image
app.post("/api/store-issue", requireAuth("citizen"), async (req, res) => {
  let client;
  try {
    const { userId, issueTitle, issueCategory, issueLocation, issueDescription, reportingMethod } = req.body;

    // Connect to MongoDB
    const { MongoClient, ObjectId } = require('mongodb');
    client = new MongoClient(MONGO_URI);

    await client.connect();
    const db = client.db(DB_NAME);

    // ✅ The report owner is the authenticated citizen; a supplied userId must
    //    be well-formed, exist, and match the session or the call is rejected.
    const identity = await verifySuppliedIdentity(res, {
      supplied: userId,
      authId: req.auth.id,
      invalidLabel: "user ID",
      unknownMessage: "User not found",
      lookup: (id) => db.collection("users").findOne({ _id: id }, { projection: { _id: 1 } }),
    });
    if (!identity.ok) return;

    const ownerId = new ObjectId(String(req.auth.id));

    // ✅ The referenced citizen must actually exist
    const reportingUser = await db.collection("users").findOne({ _id: ownerId });
    if (!reportingUser) {
      return res.status(400).json({
        success: false,
        error: "User not found"
      });
    }

    const collection = db.collection("user_reports");

    // Prepare document
    const document = {
      user_id: ownerId,
      issue_title: issueTitle || "Untitled Issue",
      issue_category: issueCategory || "Other",
      issue_location: issueLocation || "Unknown Location",
      issue_description: issueDescription || "No description provided",
      reporting_method: reportingMethod || "text",
      status: STATUS.PENDING,
      priority: "Medium",
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Insert document
    const result = await collection.insertOne(document);
    
    res.json({
      success: true,
      message: "Issue stored successfully",
      reportId: result.insertedId.toString()
    });
    
  } catch (error) {
    console.error('Error storing issue:', error);
    res.status(500).json({
      success: false,
      error: "Failed to store issue"
    });
  } finally {
    if (client) await client.close().catch(() => {});
  }
});

// API endpoint to get user reports
app.get("/api/user/reports/:userId", requireAuth("citizen"), async (req, res) => {
  let client;
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return invalidIdResponse(res, "user ID");
    }

    const { MongoClient, ObjectId } = require('mongodb');
    client = new MongoClient(MONGO_URI);

    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection("user_reports");

    // ✅ Ownership is decided by the session; the path id must match it
    const identity = await verifySuppliedIdentity(res, {
      supplied: userId,
      authId: req.auth.id,
      invalidLabel: "user ID",
      unknownMessage: "User not found",
      lookup: (id) => db.collection("users").findOne({ _id: id }, { projection: { _id: 1 } }),
    });
    if (!identity.ok) return;

    const ownerId = String(req.auth.id);

    // Get user reports (without image data for performance).
    // $in keeps legacy rows that stored user_id as a plain string readable.
    const reports = await collection.find(
      { user_id: { $in: [new ObjectId(ownerId), ownerId] } },
      { projection: { image_data: 0 } } // Exclude image data
    ).sort({ created_at: -1 }).toArray();

    res.json({
      success: true,
      reports: reports.map(normalizeReport)
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch reports"
    });
  } finally {
    if (client) await client.close().catch(() => {});
  }
});

// Get all user reports for admin
app.get("/api/admin/reports", requireAuth("admin"), async (req, res) => {
  let client;
  try {
    const { MongoClient } = require('mongodb');
    client = new MongoClient(MONGO_URI);

    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection("user_reports");

    // Get all reports with user details.
    // user_id is an ObjectId for new reports and a string for legacy rows, so it
    // is converted before the lookup; reports whose citizen no longer exists are
    // still returned (with an empty user object).
    const reports = await collection.aggregate([
      {
        $addFields: {
          _reporter: {
            $convert: { input: "$user_id", to: "objectId", onError: null, onNull: null }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_reporter",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          issue_title: 1,
          issue_category: 1,
          issue_location: 1,
          issue_description: 1,
          reporting_method: 1,
          status: 1,
          priority: 1,
          created_at: 1,
          updated_at: 1,
          image_timestamp: 1,
          gps_coordinates: 1,
          assigned_dm_id: 1,
          assigned_dm_name: 1,
          department: 1,
          assigned_at: 1,
          assigned_by_admin_id: 1,
          resolved_by_dm_id: 1,
          resolved_by_dm_name: 1,
          resolution_notes: 1,
          resolved_at: 1,
          user: {
            full_name: "$user.name",
            email: "$user.email",
            phone: "$user.phone"
          }
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ]).toArray();

    res.json({
      success: true,
      reports: reports.map(normalizeReport)
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch reports"
    });
  } finally {
    if (client) await client.close().catch(() => {});
  }
});

// Admin-only directory of DMs, used by the assignment UI to pick a target DM.
// Credential material (password) is never projected, and only admins may read it.
app.get("/api/admin/dms", requireAuth("admin"), async (req, res) => {
  let client;
  try {
    const { MongoClient } = require('mongodb');
    client = new MongoClient(MONGO_URI);

    await client.connect();
    const db = client.db(DB_NAME);

    const dms = await db
      .collection("dms")
      .find({}, { projection: { _id: 1, name: 1, email: 1, idNumber: 1, address: 1 } })
      .sort({ name: 1 })
      .toArray();

    res.json({ success: true, dms });

  } catch (error) {
    console.error('Error fetching DM directory:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch DM directory"
    });
  } finally {
    if (client) await client.close().catch(() => {});
  }
});

// Update report status (admin) — verify / reject only; assignment has its own route
app.put("/api/admin/reports/:reportId/status", requireAuth("admin"), async (req, res) => {
  let client;
  try {
    const { reportId } = req.params;
    const { status, adminId } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required"
      });
    }

    if (!isValidObjectId(reportId)) return invalidIdResponse(res, "report ID");
    if (adminId !== undefined && adminId !== null && adminId !== "" && !isValidObjectId(adminId)) {
      return invalidIdResponse(res, "admin ID");
    }

    const targetStatus = canonicalStatus(status);
    if (!targetStatus) {
      return res.status(400).json({ success: false, error: `Unknown status: ${status}` });
    }

    const { MongoClient, ObjectId } = require('mongodb');
    client = new MongoClient(MONGO_URI);

    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection("user_reports");

    // ✅ The acting admin is req.auth.id; a supplied adminId may only confirm it
    const identity = await verifySuppliedIdentity(res, {
      supplied: adminId,
      authId: req.auth.id,
      invalidLabel: "admin ID",
      unknownMessage: "Unknown admin",
      lookup: (id) => db.collection("admins").findOne({ _id: id }, { projection: { _id: 1 } }),
    });
    if (!identity.ok) return;

    const admin = await db.collection("admins").findOne(
      { _id: new ObjectId(String(req.auth.id)) },
      { projection: { _id: 1 } }
    );
    if (!admin) {
      return res.status(401).json({ success: false, error: "Authenticated admin no longer exists" });
    }

    if (targetStatus === STATUS.ASSIGNED) {
      return res.status(400).json({
        success: false,
        error: "Use POST /api/admin/reports/:reportId/assign to assign a report"
      });
    }

    const report = await collection.findOne({ _id: new ObjectId(reportId) });
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    const currentStatus = canonicalStatus(report.status);
    const transitionProblem = transitionError("admin", currentStatus, targetStatus);
    if (transitionProblem) {
      return res.status(409).json({
        success: false,
        error: transitionProblem,
        currentStatus,
        requestedStatus: targetStatus
      });
    }

    const updateData = {
      status: targetStatus,
      updated_at: new Date()
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(reportId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Report not found"
      });
    }

    res.json({
      success: true,
      message: "Report status updated successfully",
      status: targetStatus
    });

  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      success: false,
      error: "Failed to update report status"
    });
  } finally {
    if (client) await client.close().catch(() => {});
  }
});

// Assign a verified report to a DM and department (admin)
app.post("/api/admin/reports/:reportId/assign", requireAuth("admin"), async (req, res) => {
  let client;
  try {
    const { reportId } = req.params;
    const { adminId, dmId, department } = req.body || {};

    if (!dmId || !department) {
      return res.status(400).json({
        success: false,
        error: "DM ID and department are required"
      });
    }

    if (!isValidObjectId(reportId)) return invalidIdResponse(res, "report ID");
    if (adminId !== undefined && adminId !== null && adminId !== "" && !isValidObjectId(adminId)) {
      return invalidIdResponse(res, "admin ID");
    }
    if (!isValidObjectId(dmId)) return invalidIdResponse(res, "DM ID");
    if (typeof department !== "string" || !department.trim()) {
      return res.status(400).json({ success: false, error: "Department is required" });
    }

    const { MongoClient, ObjectId } = require('mongodb');
    client = new MongoClient(MONGO_URI);

    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection("user_reports");

    // ✅ The assigning admin is req.auth.id; a supplied adminId may only confirm it
    const identity = await verifySuppliedIdentity(res, {
      supplied: adminId,
      authId: req.auth.id,
      invalidLabel: "admin ID",
      unknownMessage: "Unknown admin",
      lookup: (id) => db.collection("admins").findOne({ _id: id }, { projection: { _id: 1 } }),
    });
    if (!identity.ok) return;

    // ✅ Both actors must exist in the database
    const admin = await db.collection("admins").findOne({ _id: new ObjectId(String(req.auth.id)) });
    if (!admin) {
      return res.status(401).json({ success: false, error: "Authenticated admin no longer exists" });
    }

    const dm = await db.collection("dms").findOne({ _id: new ObjectId(dmId) });
    if (!dm) {
      return res.status(400).json({ success: false, error: "Unknown DM" });
    }

    const report = await collection.findOne({ _id: new ObjectId(reportId) });
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    const currentStatus = canonicalStatus(report.status);
    if (currentStatus !== STATUS.VERIFIED) {
      return res.status(409).json({
        success: false,
        error: `Only a ${STATUS.VERIFIED} report can be assigned (report is ${currentStatus})`,
        currentStatus
      });
    }

    const now = new Date();
    const metadata = assignmentMetadata({ dm, admin, department, now });

    await collection.updateOne(
      { _id: new ObjectId(reportId) },
      { $set: { status: STATUS.ASSIGNED, ...metadata } }
    );

    res.json({
      success: true,
      message: "Report assigned successfully",
      status: STATUS.ASSIGNED,
      assignedTo: { id: dm._id, name: dm.name, department: metadata.department }
    });

  } catch (error) {
    console.error('Error assigning report:', error);
    res.status(500).json({
      success: false,
      error: "Failed to assign report"
    });
  } finally {
    if (client) await client.close().catch(() => {});
  }
});

// Get reports assigned to a specific DM
app.get("/api/dm/reports", requireAuth("dm"), async (req, res) => {
  let client;
  try {
    const { dmId } = req.query;

    if (dmId !== undefined && dmId !== null && dmId !== "" && !isValidObjectId(dmId)) {
      return invalidIdResponse(res, "DM ID");
    }

    const { MongoClient, ObjectId } = require('mongodb');
    client = new MongoClient(MONGO_URI);

    await client.connect();
    const db = client.db(DB_NAME);

    // ✅ The DM identity is the session; a supplied dmId may only confirm it
    const identity = await verifySuppliedIdentity(res, {
      supplied: dmId,
      authId: req.auth.id,
      invalidLabel: "DM ID",
      unknownMessage: "Unknown DM",
      lookup: (id) => db.collection("dms").findOne({ _id: id }, { projection: { _id: 1 } }),
    });
    if (!identity.ok) return;

    // ✅ A DM only ever sees reports assigned to them
    const sessionDmId = new ObjectId(String(req.auth.id));
    const dm = await db.collection("dms").findOne({ _id: sessionDmId });
    if (!dm) {
      return res.status(401).json({ success: false, error: "Authenticated DM no longer exists" });
    }

    const collection = db.collection("user_reports");

    const reports = await collection.aggregate([
      { $match: { assigned_dm_id: sessionDmId } },
      {
        $addFields: {
          _reporter: {
            $convert: { input: "$user_id", to: "objectId", onError: null, onNull: null }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_reporter",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          issue_title: 1,
          issue_category: 1,
          issue_location: 1,
          issue_description: 1,
          reporting_method: 1,
          status: 1,
          priority: 1,
          created_at: 1,
          updated_at: 1,
          image_timestamp: 1,
          gps_coordinates: 1,
          assigned_dm_id: 1,
          assigned_dm_name: 1,
          department: 1,
          assigned_at: 1,
          assigned_by_admin_id: 1,
          resolved_by_dm_id: 1,
          resolved_by_dm_name: 1,
          resolution_notes: 1,
          resolved_at: 1,
          user: {
            full_name: "$user.name",
            email: "$user.email",
            phone: "$user.phone"
          }
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    res.json({
      success: true,
      reports: reports.map(normalizeReport)
    });

  } catch (error) {
    console.error('Error fetching DM reports:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch DM reports"
    });
  } finally {
    if (client) await client.close().catch(() => {});
  }
});

// Update report status (DM) — only for reports assigned to that DM
app.put("/api/dm/reports/:reportId/status", requireAuth("dm"), async (req, res) => {
  let client;
  try {
    const { reportId } = req.params;
    const { status, dmId } = req.body || {};

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required"
      });
    }

    if (!isValidObjectId(reportId)) return invalidIdResponse(res, "report ID");
    if (dmId !== undefined && dmId !== null && dmId !== "" && !isValidObjectId(dmId)) {
      return invalidIdResponse(res, "DM ID");
    }

    const targetStatus = canonicalStatus(status);
    if (!targetStatus) {
      return res.status(400).json({ success: false, error: `Unknown status: ${status}` });
    }

    const { MongoClient, ObjectId } = require('mongodb');
    client = new MongoClient(MONGO_URI);

    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection("user_reports");

    // ✅ The acting DM is req.auth.id; a supplied dmId may only confirm it
    const identity = await verifySuppliedIdentity(res, {
      supplied: dmId,
      authId: req.auth.id,
      invalidLabel: "DM ID",
      unknownMessage: "Unknown DM",
      lookup: (id) => db.collection("dms").findOne({ _id: id }, { projection: { _id: 1 } }),
    });
    if (!identity.ok) return;

    const dm = await db.collection("dms").findOne({ _id: new ObjectId(String(req.auth.id)) });
    if (!dm) {
      return res.status(401).json({ success: false, error: "Authenticated DM no longer exists" });
    }

    const report = await collection.findOne({ _id: new ObjectId(reportId) });
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    // ✅ Authorization comes from the stored assignment, not the request body
    if (
      !report.assigned_dm_id ||
      report.assigned_dm_id.toString() !== dm._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: "Report is not assigned to this DM"
      });
    }

    const currentStatus = canonicalStatus(report.status);
    const transitionProblem = transitionError("dm", currentStatus, targetStatus);
    if (transitionProblem) {
      return res.status(409).json({
        success: false,
        error: transitionProblem,
        currentStatus,
        requestedStatus: targetStatus
      });
    }

    const now = new Date();
    const updateData = { status: targetStatus, updated_at: now };

    if (targetStatus === STATUS.RESOLVED) {
      const notes =
        req.body.notes !== undefined
          ? req.body.notes
          : req.body.completionNotes !== undefined
            ? req.body.completionNotes
            : req.body.resolution_notes;
      Object.assign(updateData, resolutionMetadata({ dm, notes, now }));
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(reportId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Report not found"
      });
    }

    res.json({
      success: true,
      message: "Report status updated successfully",
      status: targetStatus
    });

  } catch (error) {
    console.error('Error updating DM report status:', error);
    res.status(500).json({
      success: false,
      error: "Failed to update report status"
    });
  } finally {
    if (client) await client.close().catch(() => {});
  }
});


// ✅ Start server
const PORT = process.env.PORT || 5001;

if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
}

module.exports = { app, PORT, MONGO_URI, DB_NAME, mongoConnectionPromise };