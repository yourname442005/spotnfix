const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const { spawn } = require("child_process");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

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
mongoose.connect("mongodb://127.0.0.1:27017/sih_database", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Serve static files for each portal
app.use("/admin", express.static(path.join(__dirname, "Admin/public")));
app.use("/dm", express.static(path.join(__dirname, "DM/public")));
app.use("/user", express.static(path.join(__dirname, "User/public")));
app.use("/landing", express.static(path.join(__dirname, "landing_page/public")));

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
    const newUser = new User({ name, email, phone, address, password });
    await newUser.save();
    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password }); // simple check
    if (user) {
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
    } else {
      res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API endpoint to fetch user profile data
app.get("/api/user/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
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
app.put("/api/user/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, email, address } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
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
app.get("/api/admin/profile/:adminId", async (req, res) => {
  try {
    const { adminId } = req.params;
    const admin = await Admin.findById(adminId);
    
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
app.put("/api/admin/profile/:adminId", async (req, res) => {
  try {
    const { adminId } = req.params;
    const { name, email, idNumber, address } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(
      adminId,
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
app.get("/api/dm/profile/:dmId", async (req, res) => {
  try {
    const { dmId } = req.params;
    const dm = await DM.findById(dmId);
    
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
app.put("/api/dm/profile/:dmId", async (req, res) => {
  try {
    const { dmId } = req.params;
    const { name, email, idNumber, address } = req.body;
    
    const dm = await DM.findByIdAndUpdate(
      dmId,
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

    // ✅ Compare hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: "Invalid email or password" });
    }

    // ✅ If login success - return admin data
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

    const isMatch = await bcrypt.compare(password, dm.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: "Invalid email or password" });
    }

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




// ================= Image Processing API =================
// API endpoint for image upload and processing
app.post("/api/upload-image", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "No image file provided" 
      });
    }

    const { userId, issueTitle, issueCategory, issueLocation, issueDescription, reportingMethod } = req.body;

    if (!userId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        error: "User ID is required" 
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

    // Call Python script to process image
    const pythonProcess = spawn('py', [
      'process.py',
      req.file.path,
      userId,
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
app.post("/api/store-issue", async (req, res) => {
  try {
    const { userId, issueTitle, issueCategory, issueLocation, issueDescription, reportingMethod } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "User ID is required" 
      });
    }

    // Connect to MongoDB
    const { MongoClient } = require('mongodb');
    const client = new MongoClient("mongodb://127.0.0.1:27017/sih_database");
    
    await client.connect();
    const db = client.db("sih_database");
    const collection = db.collection("user_reports");
    
    // Prepare document
    const document = {
      user_id: userId,
      issue_title: issueTitle || "Untitled Issue",
      issue_category: issueCategory || "Other",
      issue_location: issueLocation || "Unknown Location",
      issue_description: issueDescription || "No description provided",
      reporting_method: reportingMethod || "text",
      status: "Pending",
      priority: "Medium",
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Insert document
    const result = await collection.insertOne(document);
    await client.close();
    
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
  }
});

// API endpoint to get user reports
app.get("/api/user/reports/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Connect to MongoDB
    const { MongoClient } = require('mongodb');
    const client = new MongoClient("mongodb://127.0.0.1:27017/sih_database");
    
    await client.connect();
    const db = client.db("sih_database");
    const collection = db.collection("user_reports");
    
    // Get user reports (without image data for performance)
    const reports = await collection.find(
      { user_id: userId },
      { projection: { image_data: 0 } } // Exclude image data
    ).sort({ created_at: -1 }).toArray();
    
    await client.close();
    
    res.json({
      success: true,
      reports: reports
    });
    
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch reports"
    });
  }
});

// Get all user reports for admin
app.get("/api/admin/reports", async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient("mongodb://127.0.0.1:27017/sih_database");
    
    await client.connect();
    const db = client.db("sih_database");
    const collection = db.collection("user_reports");
    
    // Get all reports with user details
    const reports = await collection.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
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
          user: {
            full_name: 1,
            email: 1,
            phone: 1
          }
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ]).toArray();
    
    await client.close();
    
    res.json({
      success: true,
      reports: reports
    });
    
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch reports"
    });
  }
});

// Update report status (admin)
app.put("/api/admin/reports/:reportId/status", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminId } = req.body;
    
    if (!status || !adminId) {
      return res.status(400).json({
        success: false,
        error: "Status and admin ID are required"
      });
    }
    
    const { MongoClient, ObjectId } = require('mongodb');
    const client = new MongoClient("mongodb://127.0.0.1:27017/sih_database");
    
    await client.connect();
    const db = client.db("sih_database");
    const collection = db.collection("user_reports");
    
    const updateData = {
      status: status,
      updated_at: new Date()
    };
    
    if (status === 'completed') {
      updateData.completed_by = adminId;
      updateData.completed_at = new Date();
    }
    
    const result = await collection.updateOne(
      { _id: new ObjectId(reportId) },
      { $set: updateData }
    );
    
    await client.close();
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Report not found"
      });
    }
    
    res.json({
      success: true,
      message: "Report status updated successfully"
    });
    
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      success: false,
      error: "Failed to update report status"
    });
  }
});

// Get escalated reports for DM
app.get("/api/dm/reports", async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient("mongodb://127.0.0.1:27017/sih_database");
    
    await client.connect();
    const db = client.db("sih_database");
    const collection = db.collection("user_reports");
    
    // Get reports that are pending for more than 2 days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const reports = await collection.aggregate([
      {
        $match: {
          status: "pending",
          created_at: { $lt: twoDaysAgo }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
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
          user: {
            full_name: 1,
            email: 1,
            phone: 1
          }
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ]).toArray();
    
    await client.close();
    
    res.json({
      success: true,
      reports: reports
    });
    
  } catch (error) {
    console.error('Error fetching DM reports:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch DM reports"
    });
  }
});

// Update report status (DM)
app.put("/api/dm/reports/:reportId/status", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, dmId } = req.body;
    
    if (!status || !dmId) {
      return res.status(400).json({
        success: false,
        error: "Status and DM ID are required"
      });
    }
    
    const { MongoClient, ObjectId } = require('mongodb');
    const client = new MongoClient("mongodb://127.0.0.1:27017/sih_database");
    
    await client.connect();
    const db = client.db("sih_database");
    const collection = db.collection("user_reports");
    
    const updateData = {
      status: status,
      updated_at: new Date()
    };
    
    if (status === 'completed') {
      updateData.completed_by = dmId;
      updateData.completed_at = new Date();
      updateData.escalated_to_dm = true;
    }
    
    const result = await collection.updateOne(
      { _id: new ObjectId(reportId) },
      { $set: updateData }
    );
    
    await client.close();
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Report not found"
      });
    }
    
    res.json({
      success: true,
      message: "Report status updated successfully"
    });
    
  } catch (error) {
    console.error('Error updating DM report status:', error);
    res.status(500).json({
      success: false,
      error: "Failed to update report status"
    });
  }
});

// ✅ Start server
const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));