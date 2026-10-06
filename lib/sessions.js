const crypto = require("crypto");

// Opaque server-side sessions:
//   login -> random 256-bit token -> store sha256(token) -> cookie carries the raw token
// The raw token exists only in the cookie; MongoDB only ever sees the digest.

const SESSION_COOKIE = "sih_session";
const COLLECTION = "sessions";
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // absolute session lifetime: 8 hours
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) > 0
  ? Number(process.env.SESSION_TTL_MS)
  : DEFAULT_TTL_MS;

function generateToken() {
  // 32 bytes -> 256 bits of CSPRNG entropy (OWASP session-id floor is 64 bits).
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token), "utf8").digest("hex");
}

function parseCookies(header) {
  const cookies = {};
  if (!header || typeof header !== "string") return cookies;
  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    const name = pair.slice(0, separator).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(pair.slice(separator + 1).trim());
    } catch (err) {
      cookies[name] = pair.slice(separator + 1).trim();
    }
  }
  return cookies;
}

function sessionCookie(token, { secure = false, maxAgeMs = SESSION_TTL_MS } = {}) {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

function clearedSessionCookie({ secure = false } = {}) {
  return sessionCookie("", { secure, maxAgeMs: 0 });
}

async function createSession(db, { userId, role, ttlMs = SESSION_TTL_MS }) {
  if (!userId || !role) throw new Error("createSession requires userId and role");
  const token = generateToken();
  const now = new Date();
  const doc = {
    token_hash: hashToken(token),
    user_id: userId,
    role,
    created_at: now,
    expires_at: new Date(now.getTime() + ttlMs),
  };
  await db.collection(COLLECTION).insertOne(doc);
  return { token, session: doc };
}

async function findSession(db, token) {
  if (!token) return null;
  const doc = await db.collection(COLLECTION).findOne({ token_hash: hashToken(token) });
  if (!doc) return null;
  // TTL indexing only sweeps periodically, so expiry is always enforced here.
  if (!doc.expires_at || doc.expires_at.getTime() <= Date.now()) return null;
  return doc;
}

async function destroySession(db, token) {
  if (!token) return { deletedCount: 0 };
  return db.collection(COLLECTION).deleteOne({ token_hash: hashToken(token) });
}

async function ensureSessionIndex(db) {
  await db.collection(COLLECTION).createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  COLLECTION,
  generateToken,
  hashToken,
  parseCookies,
  sessionCookie,
  clearedSessionCookie,
  createSession,
  findSession,
  destroySession,
  ensureSessionIndex,
};
