/**
 * ADMIN DM DIRECTORY — GET /api/admin/dms.
 *
 * The admin portal needs a list of real DMs to assign verified reports to.
 * Written red-first (TDD). Seam: the public HTTP API only.
 *
 * Covered requirements:
 *   - anonymous GET                -> 401 (no identity leakage)
 *   - authenticated citizen GET    -> 403 (wrong role, BFLA)
 *   - authenticated DM GET         -> 403 (wrong role, BFLA)
 *   - authenticated admin GET      -> 200 with the DM directory
 *   - response never contains password material
 */
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { MongoClient, ObjectId } = require("mongodb");

const TEST_URI = "mongodb://127.0.0.1:27017/sih_test_dm_directory";
const TEST_DB = "sih_test_dm_directory";

process.env.MONGODB_URI = TEST_URI;
process.env.MONGO_DB_NAME = TEST_DB;

const { app, mongoConnectionPromise } = require("../server");
const { hashPassword } = require("../lib/passwords");

const SESSION_COOKIE = "sih_session";
const PW = "correct horse battery staple";

let baseUrl;
let httpServer;
let client;
let db;

function sessionCookie(res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const match = raw.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  return `${SESSION_COOKIE}=${match.split(";")[0].split("=")[1]}`;
}

async function post(path, body, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    payload = null;
  }
  return { status: response.status, body: payload, headers: response.headers };
}

async function get(path, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: cookie ? { Cookie: cookie } : {},
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    payload = null;
  }
  return { status: response.status, body: payload, headers: response.headers };
}

async function login(path, email, password) {
  const res = await post(path, { email, password });
  return sessionCookie(res);
}

async function seed() {
  const ids = {
    dmA: new ObjectId(),
    dmB: new ObjectId(),
    admin: new ObjectId(),
    citizen: new ObjectId(),
  };
  const pw = await hashPassword(PW);

  await db.collection("dms").insertMany([
    { _id: ids.dmA, name: "DM Alpha", idNumber: "D1", email: "dm-a@dm-dir.test", address: "Ward 1", password: pw },
    { _id: ids.dmB, name: "DM Beta", idNumber: "D2", email: "dm-b@dm-dir.test", address: "Ward 2", password: pw },
  ]);
  await db.collection("admins").insertOne({
    _id: ids.admin, name: "Admin One", idNumber: "A1", email: "admin@dm-dir.test", address: "HQ", password: pw,
  });
  await db.collection("users").insertOne({
    _id: ids.citizen, name: "Cita One", email: "cita@dm-dir.test", phone: "111", address: "Road 1", password: pw,
  });

  return ids;
}

test("admin DM directory endpoint", async (t) => {
  await mongoConnectionPromise;
  client = new MongoClient(TEST_URI);
  await client.connect();
  db = client.db(TEST_DB);
  await db.dropDatabase();

  httpServer = app.listen(0);
  await once(httpServer, "listening");
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  const ids = await seed();

  const adminCookie = await login("/api/admin/login", "admin@dm-dir.test", PW);
  const citizenCookie = await login("/api/login", "cita@dm-dir.test", PW);
  const dmCookie = await login("/api/dm/login", "dm-a@dm-dir.test", PW);

  assert.ok(adminCookie && citizenCookie && dmCookie, "all three sessions must be established");

  await t.test("anonymous GET -> 401", async () => {
    const res = await get("/api/admin/dms");
    assert.equal(res.status, 401, "anonymous callers must not read the DM directory");
    assert.equal(res.body && res.body.dms, undefined, "no DM identity data is returned");
  });

  await t.test("authenticated citizen GET -> 403", async () => {
    const res = await get("/api/admin/dms", citizenCookie);
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal(res.body && res.body.dms, undefined, "a citizen must not enumerate DMs");
  });

  await t.test("authenticated DM GET -> 403", async () => {
    const res = await get("/api/admin/dms", dmCookie);
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal(res.body && res.body.dms, undefined, "a DM must not enumerate DMs");
  });

  await t.test("authenticated admin GET -> 200 with every DM", async () => {
    const res = await get("/api/admin/dms", adminCookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.dms), "dms is an array");

    const byId = Object.fromEntries(res.body.dms.map((dm) => [dm._id, dm]));
    assert.equal(res.body.dms.length, 2, "both seeded DMs are listed");
    assert.equal(byId[ids.dmA.toString()].name, "DM Alpha");
    assert.equal(byId[ids.dmA.toString()].idNumber, "D1");
    assert.equal(byId[ids.dmB.toString()].name, "DM Beta");
    assert.equal(byId[ids.dmB.toString()].address, "Ward 2");
  });

  await t.test("the directory never exposes credentials", async () => {
    const res = await get("/api/admin/dms", adminCookie);
    assert.equal(res.status, 200);
    for (const dm of res.body.dms) {
      assert.equal(dm.password, undefined, "password must never be part of the response");
    }
    assert.equal(JSON.stringify(res.body).includes("$2"), false, "no bcrypt hashes leak");
  });
});

after(async () => {
  if (httpServer) {
    if (typeof httpServer.closeAllConnections === "function") {
      httpServer.closeAllConnections();
    }
    await new Promise((resolve) => httpServer.close(resolve));
  }
  if (db) await db.dropDatabase().catch(() => {});
  if (client) await client.close().catch(() => {});
  const mongoose = require("mongoose");
  await mongoose.connection.close();
});
