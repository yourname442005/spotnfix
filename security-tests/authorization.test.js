/**
 * AUTHORIZATION VULNERABILITY TESTS — RED BY DESIGN.
 *
 * These tests assert the behaviour a correctly authorized report API MUST have.
 * The project has no authenticated identity layer at all: no session store, no
 * JWT, no cookie, no shared secret, no auth middleware (verified by grep over
 * server.js — the only `app.use` calls are cors, express.json and static dirs).
 * Caller identity is therefore self-asserted by the client in the URL, query
 * string or JSON body.
 *
 * Until an identity layer exists, every test below FAILS, and that failure IS
 * the demonstration of the vulnerability:
 *
 *     npm run test:security    # non-zero exit == vulnerabilities demonstrated
 *     npm test                 # excludes this directory and must stay green
 *
 * Seam (per the TDD skill): the seven public HTTP endpoints named in the
 * authorization audit, exercised only through their public interface.
 * Controls marked "control" assert what IS already enforced today and pass.
 */
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { MongoClient, ObjectId } = require("mongodb");

const TEST_URI = "mongodb://127.0.0.1:27017/sih_test_authz";
const TEST_DB = "sih_test_authz";

process.env.MONGODB_URI = TEST_URI;
process.env.MONGO_DB_NAME = TEST_DB;

const { app, mongoConnectionPromise } = require("../server");

let baseUrl;
let httpServer;
let client;
let db;

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
  return { status: response.status, body: payload };
}

// Controls exercise the *authenticated* model, so they need a real session.
async function loginAs(path, email, password) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const hit = setCookie.find((c) => c.startsWith("sih_session="));
  assert.ok(hit, `${path} did not issue a session cookie`);
  return `sih_session=${hit.split(";")[0].split("=")[1]}`;
}

const NO_CREDENTIALS = "no Authorization header, cookie or token is sent by the caller";

async function seed() {
  const ids = {
    adminOne: new ObjectId(),
    adminTwo: new ObjectId(),
    dmA: new ObjectId(),
    dmB: new ObjectId(),
    citizenV1: new ObjectId(),
    citizenV2: new ObjectId(),
    reportAssignedA1: new ObjectId(),
    reportAssignedA2: new ObjectId(),
    reportPending: new ObjectId(),
    reportVerifiedA: new ObjectId(),
    reportVerifiedB: new ObjectId(),
  };

  await db.collection("admins").insertMany([
    { _id: ids.adminOne, name: "Admin One", idNumber: "A1", email: "a1@t.test", address: "HQ", password: "x" },
    { _id: ids.adminTwo, name: "Admin Two", idNumber: "A2", email: "a2@t.test", address: "HQ", password: "x" },
  ]);
  await db.collection("dms").insertMany([
    { _id: ids.dmA, name: "DM Alpha", idNumber: "D1", email: "da@t.test", address: "W1", password: "x" },
    { _id: ids.dmB, name: "DM Beta", idNumber: "D2", email: "db@t.test", address: "W2", password: "x" },
  ]);
  await db.collection("users").insertMany([
    { _id: ids.citizenV1, name: "Victim One", email: "v1@t.test", phone: "111", address: "Road 1", password: "x" },
    { _id: ids.citizenV2, name: "Victim Two", email: "v2@t.test", phone: "222", address: "Road 2", password: "x" },
  ]);

  const base = (extra) => ({
    issue_category: "Lighting",
    issue_location: "Main Road",
    issue_description: "Lamp dead",
    reporting_method: "text",
    priority: "Medium",
    user_id: ids.citizenV1,
    created_at: new Date(),
    updated_at: new Date(),
    ...extra,
  });

  await db.collection("user_reports").insertMany([
    base({
      _id: ids.reportAssignedA1,
      issue_title: "Assigned to DM A (read target)",
      status: "ASSIGNED",
      assigned_dm_id: ids.dmA,
      assigned_dm_name: "DM Alpha",
      department: "Electrical",
      assigned_by_admin_id: ids.adminOne,
      assigned_at: new Date(),
    }),
    base({
      _id: ids.reportAssignedA2,
      issue_title: "Assigned to DM A (write target)",
      status: "ASSIGNED",
      assigned_dm_id: ids.dmA,
      assigned_dm_name: "DM Alpha",
      department: "Electrical",
      assigned_by_admin_id: ids.adminOne,
      assigned_at: new Date(),
    }),
    base({ _id: ids.reportPending, issue_title: "Pending target", status: "PENDING" }),
    base({ _id: ids.reportVerifiedA, issue_title: "Verified target A", status: "VERIFIED" }),
    base({ _id: ids.reportVerifiedB, issue_title: "Verified target B", status: "VERIFIED" }),
  ]);

  return ids;
}

test("report API authorization audit", async (t) => {
  await mongoConnectionPromise;
  client = new MongoClient(TEST_URI);
  await client.connect();
  db = client.db(TEST_DB);
  await db.dropDatabase();

  httpServer = app.listen(0);
  await once(httpServer, "listening");
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  const ids = await seed();
  const report = (id) => db.collection("user_reports").findOne({ _id: id });

  const asStr = (id) => id.toString();

  // ---------------------------------------------------------------------
  // R1–R7: "Can an unauthenticated caller invoke the endpoint?"
  // Expected: 401 on every endpoint. Actual today: 2xx/4xx, never 401.
  // ---------------------------------------------------------------------

  await t.test("R1 GET /api/dm/reports rejects unauthenticated callers (401)", async () => {
    const res = await api("GET", `/api/dm/reports?dmId=${asStr(ids.dmA)}`);
    assert.equal(
      res.status,
      401,
      `${NO_CREDENTIALS}; endpoint returned ${res.status} and ${
        res.body && res.body.reports ? res.body.reports.length : "?"
      } report(s) of DM Alpha to an anonymous caller`
    );
  });

  await t.test("R2 PUT /api/dm/reports/:id/status rejects unauthenticated callers (401)", async () => {
    const res = await api("PUT", `/api/dm/reports/${asStr(ids.reportAssignedA2)}/status`, {
      status: "IN_PROGRESS",
      dmId: asStr(ids.dmA),
    });
    const stored = await report(ids.reportAssignedA2);
    assert.equal(
      res.status,
      401,
      `${NO_CREDENTIALS}; endpoint returned ${res.status} and left the report in status ${stored.status}`
    );
  });

  await t.test("R3 POST /api/admin/reports/:reportId/assign rejects unauthenticated callers (401)", async () => {
    const res = await api("POST", `/api/admin/reports/${asStr(ids.reportVerifiedA)}/assign`, {
      adminId: asStr(ids.adminOne),
      dmId: asStr(ids.dmA),
      department: "Electrical",
    });
    const stored = await report(ids.reportVerifiedA);
    assert.equal(
      res.status,
      401,
      `${NO_CREDENTIALS}; endpoint returned ${res.status} and produced status ${stored.status} with assigned_by_admin_id=${stored.assigned_by_admin_id}`
    );
  });

  await t.test("R4 PUT /api/admin/reports/:id/status rejects unauthenticated callers (401)", async () => {
    const res = await api("PUT", `/api/admin/reports/${asStr(ids.reportPending)}/status`, {
      status: "VERIFIED",
      adminId: asStr(ids.adminOne),
    });
    const stored = await report(ids.reportPending);
    assert.equal(
      res.status,
      401,
      `${NO_CREDENTIALS}; endpoint returned ${res.status} and left the report in status ${stored.status}`
    );
  });

  await t.test("R5 POST /api/store-issue rejects unauthenticated callers (401)", async () => {
    const before = await db.collection("user_reports").countDocuments({
      user_id: ids.citizenV1,
      issue_title: "Forged by anonymous caller",
    });
    const res = await api("POST", "/api/store-issue", {
      userId: asStr(ids.citizenV1),
      issueTitle: "Forged by anonymous caller",
      issueCategory: "Other",
      issueLocation: "Nowhere",
      issueDescription: "Filed while pretending to be the victim",
      reportingMethod: "text",
    });
    const after = await db.collection("user_reports").countDocuments({
      user_id: ids.citizenV1,
      issue_title: "Forged by anonymous caller",
    });
    assert.equal(res.status, 401, `${NO_CREDENTIALS}; endpoint returned ${res.status}`);
    assert.equal(after, before, "anonymous caller must not be able to file a report under another citizen's ID");
  });

  await t.test("R6 POST /api/upload-image rejects unauthenticated callers (401)", async () => {
    const form = new FormData();
    form.append("image", new Blob([Buffer.from("not-a-real-image")], { type: "image/png" }), "shot.png");
    form.append("userId", asStr(ids.citizenV1));
    form.append("issueTitle", "Forged upload by anonymous caller");
    const res = await fetch(`${baseUrl}/api/upload-image`, { method: "POST", body: form });
    assert.equal(
      res.status,
      401,
      `${NO_CREDENTIALS}; endpoint returned ${res.status} for an anonymous upload attributed to another citizen`
    );
  });

  await t.test("R7 GET /api/user/reports/:userId rejects unauthenticated citizens (401, IDOR)", async () => {
    const res = await api("GET", `/api/user/reports/${asStr(ids.citizenV1)}`);
    const leaked = res.body && res.body.reports ? res.body.reports.length : 0;
    assert.equal(
      res.status,
      401,
      `${NO_CREDENTIALS}; endpoint returned ${res.status} with ${leaked} of another citizen's reports`
    );
  });

  await t.test("R8 an identity that does not exist is still not an authentication check (401)", async () => {
    const res = await api("GET", `/api/user/reports/${new ObjectId()}`);
    assert.equal(
      res.status,
      401,
      `existence of the referenced user is irrelevant to authentication; endpoint returned ${res.status}`
    );
  });

  // ---------------------------------------------------------------------
  // "Can one admin perform an operation while pretending to be another admin?"
  // ---------------------------------------------------------------------

  await t.test("R9 admin identity must come from the server, not the request body (401)", async () => {
    const res = await api("POST", `/api/admin/reports/${asStr(ids.reportVerifiedB)}/assign`, {
      adminId: asStr(ids.adminTwo),
      dmId: asStr(ids.dmB),
      department: "Bridges",
    });
    const stored = await report(ids.reportVerifiedB);
    assert.equal(
      res.status,
      401,
      `${NO_CREDENTIALS}; endpoint returned ${res.status} and recorded assigned_by_admin_id=${stored.assigned_by_admin_id} ` +
        `(adminTwo=${asStr(ids.adminTwo)}), i.e. the action was attributed to a client-supplied admin ID`
    );
  });

  // ---------------------------------------------------------------------
  // ID discovery: admin/DM ObjectIds are handed to anonymous callers and are
  // the raw material for the impersonation above.
  // ---------------------------------------------------------------------

  await t.test("R10 GET /api/admin/reports rejects unauthenticated callers and stops leaking identity ObjectIds (401)", async () => {
    const res = await api("GET", "/api/admin/reports");
    const first = res.body && res.body.reports && res.body.reports[0];
    assert.equal(res.status, 401, `${NO_CREDENTIALS}; endpoint returned ${res.status} with the full report list`);
    assert.equal(
      first && first.assigned_by_admin_id,
      undefined,
      `admin/DM ObjectIds must not be disclosed to unauthenticated callers; found assigned_by_admin_id=${first && first.assigned_by_admin_id}, assigned_dm_id=${first && first.assigned_dm_id}`
    );
  });

  // ---------------------------------------------------------------------
  // Controls: what IS enforced (passes) — now including caller identity.
  // Together with R1–R10 they show the model is "authenticated caller +
  // resource binding", not "whoever you claim to be in the body".
  // ---------------------------------------------------------------------

  await t.test("control: a DM-scoped read does not return another DM's reports", async () => {
    const session = await loginAs("/api/dm/login", "db@t.test", "x");
    const res = await api("GET", `/api/dm/reports?dmId=${asStr(ids.dmB)}`, undefined, session);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const ids2 = res.body.reports.map((r) => r._id);
    assert.ok(!ids2.includes(asStr(ids.reportAssignedA1)), "DM B must not see DM A's report");
    assert.ok(!ids2.includes(asStr(ids.reportAssignedA2)));

    const anonymous = await api("GET", `/api/dm/reports?dmId=${asStr(ids.dmB)}`);
    assert.equal(anonymous.status, 401, "the same query without a session is rejected");
  });

  await t.test("control: a report assigned to DM A cannot be modified using DM B's ID (403)", async () => {
    const session = await loginAs("/api/dm/login", "db@t.test", "x");
    const res = await api(
      "PUT",
      `/api/dm/reports/${asStr(ids.reportAssignedA1)}/status`,
      { status: "IN_PROGRESS", dmId: asStr(ids.dmB) },
      session
    );
    assert.equal(res.status, 403);
    const stored = await report(ids.reportAssignedA1);
    assert.equal(stored.status, "ASSIGNED");
  });

  await t.test("control: a citizen ID is not accepted where an admin identity is required", async () => {
    const session = await loginAs("/api/admin/login", "a1@t.test", "x");
    const res = await api(
      "PUT",
      `/api/admin/reports/${asStr(ids.reportPending)}/status`,
      { status: "VERIFIED", adminId: asStr(ids.citizenV1) },
      session
    );
    assert.ok(res.status >= 400, `expected denial, got ${res.status}`);
    assert.equal((await report(ids.reportPending)).status, "PENDING");
  });

  await t.test("control: a DM ID is not accepted where an admin identity is required", async () => {
    const session = await loginAs("/api/admin/login", "a1@t.test", "x");
    const res = await api(
      "POST",
      `/api/admin/reports/${asStr(ids.reportVerifiedA)}/assign`,
      { adminId: asStr(ids.dmA), dmId: asStr(ids.dmA), department: "Electrical" },
      session
    );
    assert.ok(res.status >= 400, `expected denial, got ${res.status}`);
    assert.equal((await report(ids.reportVerifiedA)).status, "VERIFIED");
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
