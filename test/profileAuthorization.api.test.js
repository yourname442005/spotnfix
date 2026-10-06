/**
 * PROFILE AUTHORIZATION TESTS — IDOR / BFLA on the six profile endpoints.
 *
 * Written red-first (TDD). Seam: the public HTTP API only.
 *
 * Covered requirements (per profile category: USER, ADMIN, DM):
 *   - anonymous GET/PUT           -> 401
 *   - authenticated owner GET     -> success (existing response shape)
 *   - authenticated owner PUT     -> success (existing response shape, persisted)
 *   - same-role other identity    -> 403 (no data leaked)
 *   - cross-role caller           -> 403 (no data leaked)
 *   - malformed path ID           -> 400
 *
 * Identity always comes from the session (req.auth.id); the path parameter is
 * never trusted as proof of identity.
 */
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { MongoClient, ObjectId } = require("mongodb");

const TEST_URI = "mongodb://127.0.0.1:27017/sih_test_profiles";
const TEST_DB = "sih_test_profiles";

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

function cookieHeader(res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return raw.length ? raw : res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : [];
}

function sessionCookie(res) {
  const match = cookieHeader(res).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
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

async function api(method, path, body, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
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
    citizenOne: new ObjectId(),
    citizenTwo: new ObjectId(),
    adminOne: new ObjectId(),
    adminTwo: new ObjectId(),
    dmA: new ObjectId(),
    dmB: new ObjectId(),
  };

  const pw = await hashPassword(PW);

  await db.collection("users").insertMany([
    { _id: ids.citizenOne, name: "Cita One", email: "cita@profiles.test", phone: "111", address: "Road 1", password: pw },
    { _id: ids.citizenTwo, name: "Cita Two", email: "victim@profiles.test", phone: "222", address: "Road 2", password: pw },
  ]);
  await db.collection("admins").insertMany([
    { _id: ids.adminOne, name: "Admin One", idNumber: "A1", email: "a1@profiles.test", address: "HQ", password: pw },
    { _id: ids.adminTwo, name: "Admin Two", idNumber: "A2", email: "a2@profiles.test", address: "HQ", password: pw },
  ]);
  await db.collection("dms").insertMany([
    { _id: ids.dmA, name: "DM Alpha", idNumber: "D1", email: "dm-a@profiles.test", address: "W1", password: pw },
    { _id: ids.dmB, name: "DM Beta", idNumber: "D2", email: "dm-b@profiles.test", address: "W2", password: pw },
  ]);

  return ids;
}

const str = (id) => id.toString();
const userDoc = (id) => db.collection("users").findOne({ _id: id });
const adminDoc = (id) => db.collection("admins").findOne({ _id: id });
const dmDoc = (id) => db.collection("dms").findOne({ _id: id });

test("profile endpoint authorization", async (t) => {
  await mongoConnectionPromise;
  client = new MongoClient(TEST_URI);
  await client.connect();
  db = client.db(TEST_DB);
  await db.dropDatabase();

  httpServer = app.listen(0);
  await once(httpServer, "listening");
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  const ids = await seed();

  const citizenCookie = await login("/api/login", "cita@profiles.test", PW);
  const victimCookie = await login("/api/login", "victim@profiles.test", PW);
  const adminCookie = await login("/api/admin/login", "a1@profiles.test", PW);
  const adminTwoCookie = await login("/api/admin/login", "a2@profiles.test", PW);
  const dmCookie = await login("/api/dm/login", "dm-a@profiles.test", PW);
  const dmBCookie = await login("/api/dm/login", "dm-b@profiles.test", PW);

  assert.ok(citizenCookie && victimCookie && adminCookie && adminTwoCookie && dmCookie && dmBCookie,
    "all six sessions must be established before running the authorization matrix");

  // ------------------------------------------------------------------
  // USER PROFILE
  // ------------------------------------------------------------------

  await t.test("USER: anonymous GET -> 401", async () => {
    const res = await api("GET", `/api/user/profile/${str(ids.citizenOne)}`);
    assert.equal(res.status, 401, "anonymous caller must not read a profile");
    assert.equal(res.body && res.body.user, undefined, "no profile data is returned");
  });

  await t.test("USER: anonymous PUT -> 401", async () => {
    const before = await userDoc(ids.citizenOne);
    const res = await api("PUT", `/api/user/profile/${str(ids.citizenOne)}`, { name: "Anonymous Overwrite" });
    assert.equal(res.status, 401, "anonymous caller must not update a profile");
    const after = await userDoc(ids.citizenOne);
    assert.equal(after.name, before.name, "profile must be unchanged after an anonymous PUT");
  });

  await t.test("USER: authenticated owner GET -> success", async () => {
    const res = await api("GET", `/api/user/profile/${str(ids.citizenOne)}`, undefined, citizenCookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.id, str(ids.citizenOne));
    assert.equal(res.body.user.name, "Cita One");
    assert.equal(res.body.user.email, "cita@profiles.test");
    assert.equal(res.body.user.password, undefined, "password is never part of the response");
  });

  await t.test("USER: authenticated owner PUT -> success", async () => {
    const res = await api(
      "PUT",
      `/api/user/profile/${str(ids.citizenOne)}`,
      { name: "Cita One Updated", phone: "999", email: "cita@profiles.test", address: "Road 1B" },
      citizenCookie
    );
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Profile updated successfully");
    assert.equal(res.body.user.id, str(ids.citizenOne));
    assert.equal(res.body.user.name, "Cita One Updated");

    const stored = await userDoc(ids.citizenOne);
    assert.equal(stored.name, "Cita One Updated", "update is persisted");
    assert.equal(stored.phone, "999");
    assert.equal(stored.address, "Road 1B");
  });

  await t.test("USER: authenticated different user GET -> 403", async () => {
    const res = await api("GET", `/api/user/profile/${str(ids.citizenOne)}`, undefined, victimCookie);
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal(res.body && res.body.user, undefined, "no profile data leaks to the other citizen");
  });

  await t.test("USER: authenticated different user PUT -> 403", async () => {
    const before = await userDoc(ids.citizenOne);
    const res = await api(
      "PUT",
      `/api/user/profile/${str(ids.citizenOne)}`,
      { name: "Hijacked By Victim" },
      victimCookie
    );
    assert.equal(res.status, 403, JSON.stringify(res.body));
    const after = await userDoc(ids.citizenOne);
    assert.equal(after.name, before.name, "profile must be unchanged after a rejected PUT");
  });

  await t.test("USER: admin attempting user profile -> 403", async () => {
    const getRes = await api("GET", `/api/user/profile/${str(ids.citizenOne)}`, undefined, adminCookie);
    assert.equal(getRes.status, 403, JSON.stringify(getRes.body));
    assert.equal(getRes.body && getRes.body.user, undefined);

    const putRes = await api(
      "PUT",
      `/api/user/profile/${str(ids.citizenOne)}`,
      { name: "Admin Overwrite" },
      adminCookie
    );
    assert.equal(putRes.status, 403, JSON.stringify(putRes.body));
    const stored = await userDoc(ids.citizenOne);
    assert.equal(stored.name, "Cita One Updated", "profile unchanged after admin PUT attempt");
  });

  await t.test("USER: DM attempting user profile -> 403", async () => {
    const getRes = await api("GET", `/api/user/profile/${str(ids.citizenOne)}`, undefined, dmCookie);
    assert.equal(getRes.status, 403, JSON.stringify(getRes.body));
    assert.equal(getRes.body && getRes.body.user, undefined);

    const putRes = await api(
      "PUT",
      `/api/user/profile/${str(ids.citizenOne)}`,
      { name: "DM Overwrite" },
      dmCookie
    );
    assert.equal(putRes.status, 403, JSON.stringify(putRes.body));
    const stored = await userDoc(ids.citizenOne);
    assert.equal(stored.name, "Cita One Updated", "profile unchanged after DM PUT attempt");
  });

  await t.test("USER: malformed userId -> 400", async () => {
    const getRes = await api("GET", "/api/user/profile/not-a-valid-id", undefined, citizenCookie);
    assert.equal(getRes.status, 400, JSON.stringify(getRes.body));
    assert.equal(getRes.body && getRes.body.user, undefined);

    const putRes = await api("PUT", "/api/user/profile/not-a-valid-id", { name: "Nope" }, citizenCookie);
    assert.equal(putRes.status, 400, JSON.stringify(putRes.body));
  });

  // ------------------------------------------------------------------
  // ADMIN PROFILE
  // ------------------------------------------------------------------

  await t.test("ADMIN: anonymous GET -> 401", async () => {
    const res = await api("GET", `/api/admin/profile/${str(ids.adminOne)}`);
    assert.equal(res.status, 401, "anonymous caller must not read an admin profile");
    assert.equal(res.body && res.body.admin, undefined, "no profile data is returned");
  });

  await t.test("ADMIN: anonymous PUT -> 401", async () => {
    const before = await adminDoc(ids.adminOne);
    const res = await api("PUT", `/api/admin/profile/${str(ids.adminOne)}`, { name: "Anonymous Overwrite" });
    assert.equal(res.status, 401, "anonymous caller must not update an admin profile");
    const after = await adminDoc(ids.adminOne);
    assert.equal(after.name, before.name, "profile must be unchanged after an anonymous PUT");
  });

  await t.test("ADMIN: authenticated owner GET -> success", async () => {
    const res = await api("GET", `/api/admin/profile/${str(ids.adminOne)}`, undefined, adminCookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.equal(res.body.admin.id, str(ids.adminOne));
    assert.equal(res.body.admin.name, "Admin One");
    assert.equal(res.body.admin.email, "a1@profiles.test");
    assert.equal(res.body.admin.idNumber, "A1");
    assert.equal(res.body.admin.password, undefined, "password is never part of the response");
  });

  await t.test("ADMIN: authenticated owner PUT -> success", async () => {
    const res = await api(
      "PUT",
      `/api/admin/profile/${str(ids.adminOne)}`,
      { name: "Admin One Updated", email: "a1@profiles.test", idNumber: "A1", address: "HQ East" },
      adminCookie
    );
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Admin profile updated successfully");
    assert.equal(res.body.admin.id, str(ids.adminOne));
    assert.equal(res.body.admin.name, "Admin One Updated");

    const stored = await adminDoc(ids.adminOne);
    assert.equal(stored.name, "Admin One Updated", "update is persisted");
    assert.equal(stored.address, "HQ East");
  });

  await t.test("ADMIN: different admin GET -> 403", async () => {
    const res = await api("GET", `/api/admin/profile/${str(ids.adminOne)}`, undefined, adminTwoCookie);
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal(res.body && res.body.admin, undefined, "no profile data leaks to the other admin");
  });

  await t.test("ADMIN: different admin PUT -> 403", async () => {
    const before = await adminDoc(ids.adminOne);
    const res = await api(
      "PUT",
      `/api/admin/profile/${str(ids.adminOne)}`,
      { name: "Hijacked By Admin Two" },
      adminTwoCookie
    );
    assert.equal(res.status, 403, JSON.stringify(res.body));
    const after = await adminDoc(ids.adminOne);
    assert.equal(after.name, before.name, "profile must be unchanged after a rejected PUT");
  });

  await t.test("ADMIN: user attempting admin profile -> 403", async () => {
    const getRes = await api("GET", `/api/admin/profile/${str(ids.adminOne)}`, undefined, citizenCookie);
    assert.equal(getRes.status, 403, JSON.stringify(getRes.body));
    assert.equal(getRes.body && getRes.body.admin, undefined);

    const putRes = await api(
      "PUT",
      `/api/admin/profile/${str(ids.adminOne)}`,
      { name: "Citizen Overwrite" },
      citizenCookie
    );
    assert.equal(putRes.status, 403, JSON.stringify(putRes.body));
    const stored = await adminDoc(ids.adminOne);
    assert.equal(stored.name, "Admin One Updated", "profile unchanged after citizen PUT attempt");
  });

  await t.test("ADMIN: DM attempting admin profile -> 403", async () => {
    const getRes = await api("GET", `/api/admin/profile/${str(ids.adminOne)}`, undefined, dmCookie);
    assert.equal(getRes.status, 403, JSON.stringify(getRes.body));
    assert.equal(getRes.body && getRes.body.admin, undefined);

    const putRes = await api(
      "PUT",
      `/api/admin/profile/${str(ids.adminOne)}`,
      { name: "DM Overwrite" },
      dmCookie
    );
    assert.equal(putRes.status, 403, JSON.stringify(putRes.body));
    const stored = await adminDoc(ids.adminOne);
    assert.equal(stored.name, "Admin One Updated", "profile unchanged after DM PUT attempt");
  });

  await t.test("ADMIN: malformed adminId -> 400", async () => {
    const getRes = await api("GET", "/api/admin/profile/not-a-valid-id", undefined, adminCookie);
    assert.equal(getRes.status, 400, JSON.stringify(getRes.body));
    assert.equal(getRes.body && getRes.body.admin, undefined);

    const putRes = await api("PUT", "/api/admin/profile/not-a-valid-id", { name: "Nope" }, adminCookie);
    assert.equal(putRes.status, 400, JSON.stringify(putRes.body));
  });

  // ------------------------------------------------------------------
  // DM PROFILE
  // ------------------------------------------------------------------

  await t.test("DM: anonymous GET -> 401", async () => {
    const res = await api("GET", `/api/dm/profile/${str(ids.dmA)}`);
    assert.equal(res.status, 401, "anonymous caller must not read a DM profile");
    assert.equal(res.body && res.body.dm, undefined, "no profile data is returned");
  });

  await t.test("DM: anonymous PUT -> 401", async () => {
    const before = await dmDoc(ids.dmA);
    const res = await api("PUT", `/api/dm/profile/${str(ids.dmA)}`, { name: "Anonymous Overwrite" });
    assert.equal(res.status, 401, "anonymous caller must not update a DM profile");
    const after = await dmDoc(ids.dmA);
    assert.equal(after.name, before.name, "profile must be unchanged after an anonymous PUT");
  });

  await t.test("DM: authenticated owner GET -> success", async () => {
    const res = await api("GET", `/api/dm/profile/${str(ids.dmA)}`, undefined, dmCookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.equal(res.body.dm.id, str(ids.dmA));
    assert.equal(res.body.dm.name, "DM Alpha");
    assert.equal(res.body.dm.email, "dm-a@profiles.test");
    assert.equal(res.body.dm.idNumber, "D1");
    assert.equal(res.body.dm.password, undefined, "password is never part of the response");
  });

  await t.test("DM: authenticated owner PUT -> success", async () => {
    const res = await api(
      "PUT",
      `/api/dm/profile/${str(ids.dmA)}`,
      { name: "DM Alpha Updated", email: "dm-a@profiles.test", idNumber: "D1", address: "W2 Corridor" },
      dmCookie
    );
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "DM profile updated successfully");
    assert.equal(res.body.dm.id, str(ids.dmA));
    assert.equal(res.body.dm.name, "DM Alpha Updated");

    const stored = await dmDoc(ids.dmA);
    assert.equal(stored.name, "DM Alpha Updated", "update is persisted");
    assert.equal(stored.address, "W2 Corridor");
  });

  await t.test("DM: different DM GET -> 403", async () => {
    const res = await api("GET", `/api/dm/profile/${str(ids.dmA)}`, undefined, dmBCookie);
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal(res.body && res.body.dm, undefined, "no profile data leaks to the other DM");
  });

  await t.test("DM: different DM PUT -> 403", async () => {
    const before = await dmDoc(ids.dmA);
    const res = await api(
      "PUT",
      `/api/dm/profile/${str(ids.dmA)}`,
      { name: "Hijacked By DM B" },
      dmBCookie
    );
    assert.equal(res.status, 403, JSON.stringify(res.body));
    const after = await dmDoc(ids.dmA);
    assert.equal(after.name, before.name, "profile must be unchanged after a rejected PUT");
  });

  await t.test("DM: user attempting DM profile -> 403", async () => {
    const getRes = await api("GET", `/api/dm/profile/${str(ids.dmA)}`, undefined, victimCookie);
    assert.equal(getRes.status, 403, JSON.stringify(getRes.body));
    assert.equal(getRes.body && getRes.body.dm, undefined);

    const putRes = await api(
      "PUT",
      `/api/dm/profile/${str(ids.dmA)}`,
      { name: "Citizen Overwrite" },
      victimCookie
    );
    assert.equal(putRes.status, 403, JSON.stringify(putRes.body));
    const stored = await dmDoc(ids.dmA);
    assert.equal(stored.name, "DM Alpha Updated", "profile unchanged after citizen PUT attempt");
  });

  await t.test("DM: admin attempting DM profile -> 403", async () => {
    const getRes = await api("GET", `/api/dm/profile/${str(ids.dmA)}`, undefined, adminCookie);
    assert.equal(getRes.status, 403, JSON.stringify(getRes.body));
    assert.equal(getRes.body && getRes.body.dm, undefined);

    const putRes = await api(
      "PUT",
      `/api/dm/profile/${str(ids.dmA)}`,
      { name: "Admin Overwrite" },
      adminCookie
    );
    assert.equal(putRes.status, 403, JSON.stringify(putRes.body));
    const stored = await dmDoc(ids.dmA);
    assert.equal(stored.name, "DM Alpha Updated", "profile unchanged after admin PUT attempt");
  });

  await t.test("DM: malformed dmId -> 400", async () => {
    const getRes = await api("GET", "/api/dm/profile/not-a-valid-id", undefined, dmCookie);
    assert.equal(getRes.status, 400, JSON.stringify(getRes.body));
    assert.equal(getRes.body && getRes.body.dm, undefined);

    const putRes = await api("PUT", "/api/dm/profile/not-a-valid-id", { name: "Nope" }, dmCookie);
    assert.equal(putRes.status, 400, JSON.stringify(putRes.body));
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
