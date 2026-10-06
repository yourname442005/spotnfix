/**
 * Authentication / authorization tests for the session layer.
 *
 * Written red-first (TDD). Seam: the public HTTP API only.
 *
 * Covered requirements:
 *   1  login creates an authenticated session
 *   2  missing session -> 401
 *   3  invalid session -> 401
 *   4  expired session -> 401
 *   5  logout invalidates the session
 *   6  authenticated admin can access admin endpoints
 *   7  authenticated DM sees only their own assigned reports
 *   8  DM cannot read another DM's reports
 *   9  DM cannot modify another DM's report
 *  10  authenticated citizen sees only their own reports
 *  11  citizen cannot read another citizen's reports
 *  12  citizen cannot create a report under another user's ID
 *  13  admin cannot impersonate another admin through adminId
 *  14  DM cannot impersonate another DM through dmId
 *  15  role escalation attempts fail
 *  16  session token is not stored in plaintext in MongoDB
 */
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { MongoClient, ObjectId } = require("mongodb");

const TEST_URI = "mongodb://127.0.0.1:27017/sih_test_auth";
const TEST_DB = "sih_test_auth";

process.env.MONGODB_URI = TEST_URI;
process.env.MONGO_DB_NAME = TEST_DB;

const { app, mongoConnectionPromise } = require("../server");
const { hashPassword } = require("../lib/passwords");

const SESSION_COOKIE = "sih_session";

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

function isHttpOnly(res) {
  return cookieHeader(res).some((c) => /(^|;\s*)HttpOnly/i.test(c));
}

function sameSite(res) {
  const hit = cookieHeader(res).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const found = hit && hit.match(/SameSite=([^;]+)/i);
  return found ? found[1] : null;
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

// Deliberately does not assert: when the session layer is missing this yields a
// null cookie so that every subtest below runs and fails on its own terms.
async function login(path, email, password) {
  const res = await post(path, { email, password });
  return { cookie: sessionCookie(res), res, status: res.status };
}

async function seed() {
  const ids = {
    adminOne: new ObjectId(),
    adminTwo: new ObjectId(),
    dmA: new ObjectId(),
    dmB: new ObjectId(),
    citizenOne: new ObjectId(),
    citizenTwo: new ObjectId(),
    pending: new ObjectId(),
    assignedA: new ObjectId(),
    victimReport: new ObjectId(),
  };

  const pw = await hashPassword("correct horse battery staple");

  await db.collection("admins").insertMany([
    { _id: ids.adminOne, name: "Admin One", idNumber: "A1", email: "a1@auth.test", address: "HQ", password: pw },
    { _id: ids.adminTwo, name: "Admin Two", idNumber: "A2", email: "a2@auth.test", address: "HQ", password: pw },
  ]);
  await db.collection("dms").insertMany([
    { _id: ids.dmA, name: "DM Alpha", idNumber: "D1", email: "dm-a@auth.test", address: "W1", password: pw },
    { _id: ids.dmB, name: "DM Beta", idNumber: "D2", email: "dm-b@auth.test", address: "W2", password: pw },
  ]);
  await db.collection("users").insertMany([
    { _id: ids.citizenOne, name: "Cita One", email: "cita@auth.test", phone: "111", address: "Road 1", password: pw },
    { _id: ids.citizenTwo, name: "Cita Two", email: "victim@auth.test", phone: "222", address: "Road 2", password: pw },
  ]);

  const base = (extra) => ({
    issue_category: "Lighting",
    issue_location: "Main Road",
    issue_description: "Lamp dead",
    reporting_method: "text",
    priority: "Medium",
    user_id: ids.citizenOne,
    created_at: new Date(),
    updated_at: new Date(),
    ...extra,
  });

  await db.collection("user_reports").insertMany([
    base({ _id: ids.pending, issue_title: "Awaiting verification", status: "PENDING" }),
    base({
      _id: ids.assignedA,
      issue_title: "Already with DM A",
      status: "ASSIGNED",
      assigned_dm_id: ids.dmA,
      assigned_dm_name: "DM Alpha",
      department: "Electrical",
      assigned_by_admin_id: ids.adminOne,
      assigned_at: new Date(),
    }),
    base({
      _id: ids.victimReport,
      issue_title: "Citizen two report",
      status: "PENDING",
      user_id: ids.citizenTwo,
    }),
  ]);

  return ids;
}

const report = (id) => db.collection("user_reports").findOne({ _id: id });
const str = (id) => id.toString();

test("session authentication and authorization", async (t) => {
  await mongoConnectionPromise;
  client = new MongoClient(TEST_URI);
  await client.connect();
  db = client.db(TEST_DB);
  await db.dropDatabase();

  httpServer = app.listen(0);
  await once(httpServer, "listening");
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  const ids = await seed();

  const adminOne = await login("/api/admin/login", "a1@auth.test", "correct horse battery staple");
  const adminTwo = await login("/api/admin/login", "a2@auth.test", "correct horse battery staple");
  const dmA = await login("/api/dm/login", "dm-a@auth.test", "correct horse battery staple");
  const dmB = await login("/api/dm/login", "dm-b@auth.test", "correct horse battery staple");
  const citizenOne = await login("/api/login", "cita@auth.test", "correct horse battery staple");
  const citizenTwo = await login("/api/login", "victim@auth.test", "correct horse battery staple");

  const adminCookie = adminOne.cookie;
  const adminTwoCookie = adminTwo.cookie;
  const dmACookie = dmA.cookie;
  const dmBCookie = dmB.cookie;
  const citizenCookie = citizenOne.cookie;
  const victimCookie = citizenTwo.cookie;

  await t.test("1. login creates an authenticated session with a hardened cookie", async () => {
    assert.ok(isHttpOnly(citizenOne.res), "cookie must be HttpOnly");
    assert.equal(sameSite(citizenOne.res), "Lax", "cookie must be SameSite=Lax");
    assert.match(citizenOne.res.body && JSON.stringify(citizenOne.res.body), /success/i);

    const mine = await api("GET", `/api/user/reports/${str(ids.citizenOne)}`, undefined, citizenCookie);
    assert.equal(mine.status, 200, "session cookie authenticates the following request");
  });

  await t.test("2. missing session is rejected with 401 on every protected endpoint", async () => {
    const endpoints = [
      ["GET", "/api/admin/reports"],
      ["PUT", `/api/admin/reports/${str(ids.pending)}/status`, { status: "VERIFIED" }],
      ["POST", `/api/admin/reports/${str(ids.pending)}/assign`, { dmId: str(ids.dmA), department: "Electrical" }],
      ["GET", "/api/dm/reports"],
      ["PUT", `/api/dm/reports/${str(ids.assignedA)}/status`, { status: "IN_PROGRESS" }],
      ["GET", `/api/user/reports/${str(ids.citizenOne)}`],
      ["POST", "/api/store-issue", { issueTitle: "No session" }],
      ["POST", "/api/upload-image"],
    ];
    for (const [method, path, body] of endpoints) {
      const res = await api(method, path, body);
      assert.equal(res.status, 401, `${method} ${path} accepted an anonymous caller (${res.status})`);
    }
  });

  await t.test("3. an invalid session token is rejected with 401", async () => {
    const forged = `${SESSION_COOKIE}=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const endpoints = [
      ["GET", "/api/admin/reports"],
      ["GET", "/api/dm/reports"],
      ["GET", `/api/user/reports/${str(ids.citizenOne)}`],
    ];
    for (const [method, path] of endpoints) {
      const res = await api(method, path, undefined, forged);
      assert.equal(res.status, 401, `${method} ${path} accepted a forged token (${res.status})`);
    }
  });

  await t.test("4. an expired session is rejected with 401", async () => {
    const before = await db.collection("sessions").distinct("_id");
    const fresh = await login("/api/login", "cita@auth.test", "correct horse battery staple");
    const alive = await api("GET", `/api/user/reports/${str(ids.citizenOne)}`, undefined, fresh.cookie);
    assert.equal(alive.status, 200);

    // Expire only the session created by this test, leaving the others intact.
    const created = await db.collection("sessions").distinct("_id");
    const freshIds = created.filter((id) => !before.some((old) => String(old) === String(id)));
    assert.ok(freshIds.length >= 1, "the login created a session record");
    await db.collection("sessions").updateMany(
      { _id: { $in: freshIds } },
      { $set: { expires_at: new Date(Date.now() - 1000) } }
    );

    const afterExpiry = await api("GET", `/api/user/reports/${str(ids.citizenOne)}`, undefined, fresh.cookie);
    assert.equal(afterExpiry.status, 401, "expired session must not authenticate");
  });

  await t.test("5. logout invalidates the session server-side", async () => {
    const fresh = await login("/api/login", "cita@auth.test", "correct horse battery staple");
    const beforeLogout = await api("GET", `/api/user/reports/${str(ids.citizenOne)}`, undefined, fresh.cookie);
    assert.equal(beforeLogout.status, 200);

    const logout = await post("/api/logout", {}, fresh.cookie);
    assert.equal(logout.status, 200, JSON.stringify(logout.body));

    const afterLogout = await api("GET", `/api/user/reports/${str(ids.citizenOne)}`, undefined, fresh.cookie);
    assert.equal(afterLogout.status, 401, "the token must be dead after logout");

    const stored = await db.collection("sessions").countDocuments();
    assert.ok(stored >= 1, "other sessions (other roles) are unaffected");
  });

  await t.test("6. an authenticated admin can use the admin endpoints", async () => {
    const list = await api("GET", "/api/admin/reports", undefined, adminCookie);
    assert.equal(list.status, 200);

    const verify = await api(
      "PUT",
      `/api/admin/reports/${str(ids.pending)}/status`,
      { status: "VERIFIED", adminId: str(ids.adminOne) },
      adminCookie
    );
    assert.equal(verify.status, 200, JSON.stringify(verify.body));
    assert.equal((await report(ids.pending)).status, "VERIFIED");

    const assign = await api(
      "POST",
      `/api/admin/reports/${str(ids.pending)}/assign`,
      { adminId: str(ids.adminOne), dmId: str(ids.dmA), department: "Electrical" },
      adminCookie
    );
    assert.equal(assign.status, 200, JSON.stringify(assign.body));
    const stored = await report(ids.pending);
    assert.equal(stored.status, "ASSIGNED");
    assert.equal(stored.assigned_by_admin_id.toString(), str(ids.adminOne), "actor comes from the session");
    assert.equal(stored.assigned_dm_id.toString(), str(ids.dmA));
  });

  await t.test("7. an authenticated DM only sees their own assigned reports", async () => {
    const mine = await api("GET", "/api/dm/reports", undefined, dmACookie);
    assert.equal(mine.status, 200, JSON.stringify(mine.body));
    assert.ok(mine.body.reports.length >= 1, "DM A has assigned work");
    for (const row of mine.body.reports) {
      assert.equal(row.assigned_dm_id, str(ids.dmA), "only DM A's reports are returned");
    }
    const titles = mine.body.reports.map((r) => r.issue_title);
    assert.ok(titles.includes("Already with DM A"));
  });

  await t.test("8. a DM cannot read another DM's reports", async () => {
    const theirs = await api("GET", "/api/dm/reports", undefined, dmBCookie);
    assert.equal(theirs.status, 200);
    for (const row of theirs.body.reports) {
      assert.equal(row.assigned_dm_id, str(ids.dmB), "DM B never receives DM A's rows");
    }
    assert.ok(!theirs.body.reports.some((r) => r.issue_title === "Already with DM A"));

    const spoofed = await api("GET", `/api/dm/reports?dmId=${str(ids.dmA)}`, undefined, dmBCookie);
    assert.equal(spoofed.status, 403, "a supplied dmId cannot switch identity");
  });

  await t.test("9. a DM cannot modify a report assigned to another DM", async () => {
    const res = await api(
      "PUT",
      `/api/dm/reports/${str(ids.assignedA)}/status`,
      { status: "IN_PROGRESS", dmId: str(ids.dmB) },
      dmBCookie
    );
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal((await report(ids.assignedA)).status, "ASSIGNED", "state unchanged");

    const mismatch = await api(
      "PUT",
      `/api/dm/reports/${str(ids.assignedA)}/status`,
      { status: "IN_PROGRESS", dmId: str(ids.dmA) },
      dmBCookie
    );
    assert.equal(mismatch.status, 403, "impersonating DM A with a supplied dmId fails");
  });

  await t.test("10. an authenticated citizen only sees their own reports", async () => {
    const mine = await api("GET", `/api/user/reports/${str(ids.citizenOne)}`, undefined, citizenCookie);
    assert.equal(mine.status, 200);
    assert.ok(mine.body.reports.length >= 1);
    for (const row of mine.body.reports) {
      assert.ok(!["Citizen two report"].includes(row.issue_title), "no foreign reports leak in");
    }
  });

  await t.test("11. a citizen cannot read another citizen's reports", async () => {
    const res = await api("GET", `/api/user/reports/${str(ids.citizenTwo)}`, undefined, citizenCookie);
    assert.equal(res.status, 403, JSON.stringify(res.body));
    const leaked = res.body && res.body.reports;
    assert.ok(!Array.isArray(leaked) || leaked.length === 0, "no rows are returned");
  });

  await t.test("12. a citizen cannot create a report under another user's ID", async () => {
    const before = await db.collection("user_reports").countDocuments({ user_id: ids.citizenTwo });
    const res = await api(
      "POST",
      "/api/store-issue",
      {
        userId: str(ids.citizenTwo),
        issueTitle: "Forged against victim",
        issueCategory: "Other",
        issueLocation: "Nowhere",
        issueDescription: "impersonation attempt",
        reportingMethod: "text",
      },
      citizenCookie
    );
    assert.equal(res.status, 403, JSON.stringify(res.body));
    const after = await db.collection("user_reports").countDocuments({ user_id: ids.citizenTwo });
    assert.equal(after, before, "no report is written for the victim");
  });

  await t.test("13. an admin cannot impersonate another admin through adminId", async () => {
    const target = new ObjectId();
    await db.collection("user_reports").insertOne({
      user_id: ids.citizenOne,
      issue_title: "Impersonation target",
      issue_category: "Other",
      issue_location: "Main Road",
      issue_description: "used by the admin impersonation test",
      reporting_method: "text",
      status: "PENDING",
      priority: "Medium",
      created_at: new Date(),
      updated_at: new Date(),
    });
    const targetDoc = await db.collection("user_reports").findOne({ issue_title: "Impersonation target" });

    const res = await api(
      "POST",
      `/api/admin/reports/${targetDoc._id}/assign`,
      { adminId: str(ids.adminTwo), dmId: str(ids.dmB), department: "Bridges" },
      adminCookie
    );
    assert.equal(res.status, 403, JSON.stringify(res.body));

    const stored = await report(targetDoc._id);
    assert.notEqual(stored.status, "ASSIGNED", "the action must not happen under the forged identity");
    assert.ok(
      !stored.assigned_by_admin_id || stored.assigned_by_admin_id.toString() !== str(ids.adminTwo),
      "adminTwo is never recorded as the actor"
    );
    void target;
  });

  await t.test("14. a DM cannot impersonate another DM through dmId", async () => {
    const res = await api(
      "PUT",
      `/api/dm/reports/${str(ids.assignedA)}/status`,
      { status: "IN_PROGRESS", dmId: str(ids.dmA) },
      dmBCookie
    );
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal((await report(ids.assignedA)).status, "ASSIGNED");

    const listed = await api("GET", `/api/dm/reports?dmId=${str(ids.dmA)}`, undefined, dmBCookie);
    assert.equal(listed.status, 403, "a supplied dmId cannot open DM A's list");
  });

  await t.test("15. role escalation attempts fail", async () => {
    const citizenAsAdminList = await api("GET", "/api/admin/reports", undefined, citizenCookie);
    assert.equal(citizenAsAdminList.status, 403, "citizen must not read the admin queue");

    const citizenAsAdminWrite = await api(
      "PUT",
      `/api/admin/reports/${str(ids.pending)}/status`,
      { status: "VERIFIED", adminId: str(ids.citizenOne) },
      citizenCookie
    );
    assert.equal(citizenAsAdminWrite.status, 403, "citizen must not verify reports");

    const dmAsAdmin = await api("GET", "/api/admin/reports", undefined, dmACookie);
    assert.equal(dmAsAdmin.status, 403, "DM must not read the admin queue");

    const adminAsDm = await api("GET", "/api/dm/reports", undefined, adminCookie);
    assert.equal(adminAsDm.status, 403, "admin session is not a DM session");

    const adminAsCitizen = await api(
      "GET",
      `/api/user/reports/${str(ids.citizenOne)}`,
      undefined,
      adminCookie
    );
    assert.equal(adminAsCitizen.status, 403, "admin session is not a citizen session");
  });

  await t.test("16. the session token is never stored or echoed in plaintext", async () => {
    const raw = citizenCookie.slice(citizenCookie.indexOf("=") + 1);
    assert.ok(raw.length >= 32, "token carries at least 256 bits of entropy");

    const sessions = await db.collection("sessions").find({}).toArray();
    assert.ok(sessions.length > 0, "sessions are persisted");
    for (const doc of sessions) {
      assert.ok(!JSON.stringify(doc).includes(raw), "no session document contains the raw token");
      assert.equal(doc.token, undefined, "no raw token field");
      const hash = doc.token_hash;
      assert.match(String(hash), /^[a-f0-9]{64}$/, "token_hash is a hex digest");
      assert.notEqual(hash, raw);
    }

    const loginRes = await post("/api/login", {
      email: "cita@auth.test",
      password: "correct horse battery staple",
    });
    const fresh = sessionCookie(loginRes);
    assert.ok(fresh, "a fresh session cookie is issued");
    const echoed = fresh.slice(fresh.indexOf("=") + 1);
    assert.ok(!JSON.stringify(loginRes.body).includes(echoed), "the token is not in the response body");
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
