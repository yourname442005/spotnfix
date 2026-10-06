const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { MongoClient, ObjectId } = require("mongodb");

const TEST_URI = "mongodb://127.0.0.1:27017/sih_test_workflow";
const TEST_DB = "sih_test_workflow";

process.env.MONGODB_URI = TEST_URI;
process.env.MONGO_DB_NAME = TEST_DB;

const { app, mongoConnectionPromise } = require("../server");

let baseUrl;
let httpServer;
let client;
let db;

// Session cookies for the four actors this suite impersonates. Identity comes
// from the server-side session; the body/query IDs are validated against it.
const sessions = {};

function defaultActor(path) {
  if (path === "/api/signup" || path.endsWith("/login") || path.endsWith("/register") || path.endsWith("/logout")) {
    return null;
  }
  if (path.startsWith("/api/admin/")) return "admin";
  if (path.startsWith("/api/dm/")) return "dmA";
  if (path.startsWith("/api/user/")) return "citizen";
  if (path === "/api/store-issue" || path.startsWith("/api/upload-image")) return "citizen";
  return null;
}

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

async function api(method, path, body, opts = {}) {
  const actor = opts.as !== undefined ? opts.as : defaultActor(path);
  const cookie = actor ? sessions[actor] : null;
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

async function seed() {
  const admins = db.collection("admins");
  const dms = db.collection("dms");
  const users = db.collection("users");

  const adminId = new ObjectId();
  const dmAId = new ObjectId();
  const dmBId = new ObjectId();
  const citizenId = new ObjectId();

  await admins.insertOne({
    _id: adminId,
    name: "Admin One",
    idNumber: "ADM-1",
    email: "admin@spotnfix.test",
    address: "HQ",
    password: "hashed-irrelevant",
  });
  await dms.insertMany([
    {
      _id: dmAId,
      name: "DM Alpha",
      idNumber: "DM-1",
      email: "dm-a@spotnfix.test",
      address: "Ward 1",
      password: "hashed-irrelevant",
    },
    {
      _id: dmBId,
      name: "DM Beta",
      idNumber: "DM-2",
      email: "dm-b@spotnfix.test",
      address: "Ward 2",
      password: "hashed-irrelevant",
    },
  ]);
  await users.insertOne({
    _id: citizenId,
    name: "Cita Zen",
    email: "cita@spotnfix.test",
    phone: "9999999999",
    address: "12 Road",
    password: "plain-text-legacy",
  });

  return {
    adminId: adminId.toString(),
    dmAId: dmAId.toString(),
    dmBId: dmBId.toString(),
    citizenId: citizenId.toString(),
    citizenDocId: citizenId,
  };
}

async function createReport(userId, title = "Broken street light") {
  const res = await api("POST", "/api/store-issue", {
    userId,
    issueTitle: title,
    issueCategory: "Lighting",
    issueLocation: "Main Road",
    issueDescription: "Lamp post dead",
    reportingMethod: "text",
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.success, true);
  return res.body.reportId;
}

const getReport = (id) => db.collection("user_reports").findOne({ _id: new ObjectId(id) });

test("report lifecycle API", async (t) => {
  await mongoConnectionPromise;
  client = new MongoClient(TEST_URI);
  await client.connect();
  db = client.db(TEST_DB);
  await db.dropDatabase();

  httpServer = app.listen(0);
  await once(httpServer, "listening");
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  const seedData = await seed();
  const { adminId, dmAId, dmBId, citizenId, citizenDocId } = seedData;

  // Server-side sessions for every actor that drives the lifecycle below.
  sessions.admin = await loginAs("/api/admin/login", "admin@spotnfix.test", "hashed-irrelevant");
  sessions.dmA = await loginAs("/api/dm/login", "dm-a@spotnfix.test", "hashed-irrelevant");
  sessions.dmB = await loginAs("/api/dm/login", "dm-b@spotnfix.test", "hashed-irrelevant");

  await t.test("citizen signup stores a bcrypt hash and can log in", async () => {
    const signup = await api("POST", "/api/signup", {
      name: "New User",
      email: "new@spotnfix.test",
      phone: "123",
      address: "Addr",
      password: "new-pass-123",
    });
    assert.equal(signup.status, 200, JSON.stringify(signup.body));

    const stored = await db.collection("users").findOne({ email: "new@spotnfix.test" });
    assert.match(String(stored.password), /^\$2[aby]\$/);
    assert.notEqual(stored.password, "new-pass-123");

    const login = await api("POST", "/api/login", {
      email: "new@spotnfix.test",
      password: "new-pass-123",
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.success, true);
  });

  await t.test("legacy plaintext citizen can still log in and is upgraded", async () => {
    const login = await api("POST", "/api/login", {
      email: "cita@spotnfix.test",
      password: "plain-text-legacy",
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    assert.equal(login.body.success, true);

    const upgraded = await db.collection("users").findOne({ _id: citizenDocId });
    assert.match(String(upgraded.password), /^\$2[aby]\$/);

    const repeat = await api("POST", "/api/login", {
      email: "cita@spotnfix.test",
      password: "plain-text-legacy",
    });
    assert.equal(repeat.status, 200);

    const wrong = await api("POST", "/api/login", {
      email: "cita@spotnfix.test",
      password: "nope",
    });
    assert.equal(wrong.status, 401);

    // Logged in only now so the test above exercises the legacy upgrade first.
    sessions.citizen = await loginAs("/api/login", "cita@spotnfix.test", "plain-text-legacy");
  });

  let reportId;

  await t.test("citizen creates a report in canonical PENDING state", async () => {
    reportId = await createReport(citizenId, "Pothole outside school");

    const stored = await getReport(reportId);
    assert.equal(stored.status, "PENDING");
    assert.equal(stored.user_id.toHexString(), citizenId);
    assert.ok(stored.created_at instanceof Date);
    assert.ok(stored.updated_at instanceof Date);

    const mine = await api("GET", `/api/user/reports/${citizenId}`);
    assert.equal(mine.status, 200);
    assert.equal(mine.body.reports.length, 1);
    assert.equal(mine.body.reports[0].status, "PENDING");
    assert.equal(mine.body.reports[0]._id, reportId);
  });

  await t.test("referenced users and ObjectIds are validated", async () => {
    const badUser = await api("POST", "/api/store-issue", { userId: "not-an-id" });
    assert.equal(badUser.status, 400);
    assert.match(badUser.body.error, /Invalid user ID/i);

    const unknownUser = await api("POST", "/api/store-issue", {
      userId: new ObjectId().toString(),
    });
    assert.equal(unknownUser.status, 400);
    assert.match(unknownUser.body.error, /User not found/i);

    const badReportList = await api("GET", "/api/user/reports/12345");
    assert.equal(badReportList.status, 400);
    assert.match(badReportList.body.error, /Invalid user ID/i);

    const badAdminStatus = await api("PUT", `/api/admin/reports/${reportId}/status`, {
      status: "VERIFIED",
      adminId: "nope",
    });
    assert.equal(badAdminStatus.status, 400);

    const unknownAdminStatus = await api("PUT", `/api/admin/reports/${reportId}/status`, {
      status: "VERIFIED",
      adminId: new ObjectId().toString(),
    });
    assert.equal(unknownAdminStatus.status, 400);
    assert.match(unknownAdminStatus.body.error, /Unknown admin/i);

    const badReportStatus = await api("PUT", `/api/admin/reports/abc/status`, {
      status: "VERIFIED",
      adminId,
    });
    assert.equal(badReportStatus.status, 400);
    assert.match(badReportStatus.body.error, /Invalid report ID/i);

    const missingReport = await api("PUT", `/api/admin/reports/${new ObjectId()}/status`, {
      status: "VERIFIED",
      adminId,
    });
    assert.equal(missingReport.status, 404);
  });

  await t.test("admin sees the report with the citizen attached", async () => {
    const list = await api("GET", "/api/admin/reports");
    assert.equal(list.status, 200);
    assert.equal(list.body.reports.length, 1);
    const report = list.body.reports[0];
    assert.equal(report.status, "PENDING");
    assert.equal(report.user.full_name, "Cita Zen");
    assert.equal(report.user.email, "cita@spotnfix.test");
  });

  await t.test("admin verifies the report", async () => {
    const res = await api("PUT", `/api/admin/reports/${reportId}/status`, {
      status: "VERIFIED",
      adminId,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.status, "VERIFIED");
    assert.equal((await getReport(reportId)).status, "VERIFIED");
  });

  await t.test("admin cannot skip the lifecycle", async () => {
    const skip = await api("PUT", `/api/admin/reports/${reportId}/status`, {
      status: "RESOLVED",
      adminId,
    });
    assert.equal(skip.status, 409);
    assert.match(skip.body.error, /VERIFIED.*RESOLVED|RESOLVED/);

    const unknownStatus = await api("PUT", `/api/admin/reports/${reportId}/status`, {
      status: "banana",
      adminId,
    });
    assert.equal(unknownStatus.status, 400);
    assert.match(unknownStatus.body.error, /Unknown status/i);

    const viaStatusRoute = await api("PUT", `/api/admin/reports/${reportId}/status`, {
      status: "ASSIGNED",
      adminId,
    });
    assert.equal(viaStatusRoute.status, 400);
    assert.match(viaStatusRoute.body.error, /assign/i);

    assert.equal((await getReport(reportId)).status, "VERIFIED");
  });

  await t.test("admin rejects a second report", async () => {
    const rejectedId = await createReport(citizenId, "Illegal dumping");
    const res = await api("PUT", `/api/admin/reports/${rejectedId}/status`, {
      status: "REJECTED",
      adminId,
    });
    assert.equal(res.status, 200);
    assert.equal((await getReport(rejectedId)).status, "REJECTED");

    const again = await api("PUT", `/api/admin/reports/${rejectedId}/status`, {
      status: "VERIFIED",
      adminId,
    });
    assert.equal(again.status, 409, "REJECTED is terminal");
  });

  await t.test("assignment validates actors and records metadata", async () => {
    const unknownDm = await api("POST", `/api/admin/reports/${reportId}/assign`, {
      adminId,
      dmId: new ObjectId().toString(),
      department: "Sanitation",
    });
    assert.equal(unknownDm.status, 400);
    assert.match(unknownDm.body.error, /Unknown DM/i);

    const badDepartment = await api("POST", `/api/admin/reports/${reportId}/assign`, {
      adminId,
      dmId: dmAId,
      department: "   ",
    });
    assert.equal(badDepartment.status, 400);

    const unverified = await api("POST", `/api/admin/reports/${reportId}/assign`, {
      adminId,
      dmId: dmAId,
      department: "Sanitation",
    });
    // report is VERIFIED at this point in the flow
    assert.equal(unverified.status, 200, JSON.stringify(unverified.body));

    const stored = await getReport(reportId);
    assert.equal(stored.status, "ASSIGNED");
    assert.equal(stored.assigned_dm_id.toString(), dmAId);
    assert.equal(stored.assigned_dm_name, "DM Alpha");
    assert.equal(stored.department, "Sanitation");
    assert.equal(stored.assigned_by_admin_id.toString(), adminId);
    assert.equal(stored.assigned_by_admin_name, "Admin One");
    assert.ok(stored.assigned_at instanceof Date, "assignment timestamp recorded");
    assert.ok(stored.updated_at instanceof Date, "updated timestamp recorded");
    assert.ok(stored.assigned_at.getTime() <= stored.updated_at.getTime());
  });

  await t.test("assignment is refused for a report that is not VERIFIED", async () => {
    const pendingId = await createReport(citizenId, "Water logging");
    const res = await api("POST", `/api/admin/reports/${pendingId}/assign`, {
      adminId,
      dmId: dmAId,
      department: "Drainage",
    });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /VERIFIED/);
    assert.equal((await getReport(pendingId)).status, "PENDING");
  });

  await t.test("DM list is scoped to the requesting DM", async () => {
    const anonymous = await api("GET", "/api/dm/reports", undefined, { as: null });
    assert.equal(anonymous.status, 401, "anonymous callers get 401");

    // No dmId in the query: the DM identity comes from the session.
    const sessionScoped = await api("GET", "/api/dm/reports");
    assert.equal(sessionScoped.status, 200, JSON.stringify(sessionScoped.body));
    assert.equal(sessionScoped.body.reports.length, 1);
    assert.equal(sessionScoped.body.reports[0]._id, reportId);

    const badDm = await api("GET", "/api/dm/reports?dmId=oops");
    assert.equal(badDm.status, 400);

    const unknownDm = await api("GET", `/api/dm/reports?dmId=${new ObjectId()}`);
    assert.equal(unknownDm.status, 400);
    assert.match(unknownDm.body.error, /Unknown DM/i);

    const mismatched = await api("GET", `/api/dm/reports?dmId=${dmBId}`);
    assert.equal(mismatched.status, 403, "a supplied dmId cannot switch identity");

    const asA = await api("GET", `/api/dm/reports?dmId=${dmAId}`);
    assert.equal(asA.status, 200);
    assert.equal(asA.body.reports.length, 1);
    assert.equal(asA.body.reports[0]._id, reportId);
    assert.equal(asA.body.reports[0].status, "ASSIGNED");
    assert.equal(asA.body.reports[0].user.full_name, "Cita Zen");

    const asB = await api("GET", `/api/dm/reports?dmId=${dmBId}`, undefined, { as: "dmB" });
    assert.equal(asB.status, 200);
    assert.equal(asB.body.reports.length, 0, "DM B sees nothing assigned to DM A");
  });

  await t.test("a DM cannot touch a report assigned to another DM", async () => {
    const res = await api("PUT", `/api/dm/reports/${reportId}/status`, {
      status: "IN_PROGRESS",
      dmId: dmBId,
    }, { as: "dmB" });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /not assigned/i);
    assert.equal((await getReport(reportId)).status, "ASSIGNED");
  });

  await t.test("unknown or malformed DM IDs are rejected", async () => {
    const malformed = await api("PUT", `/api/dm/reports/${reportId}/status`, {
      status: "IN_PROGRESS",
      dmId: "xyz",
    });
    assert.equal(malformed.status, 400);

    const unknown = await api("PUT", `/api/dm/reports/${reportId}/status`, {
      status: "IN_PROGRESS",
      dmId: new ObjectId().toString(),
    });
    assert.equal(unknown.status, 400);
    assert.match(unknown.body.error, /Unknown DM/i);
  });

  await t.test("DM walks ASSIGNED -> IN_PROGRESS -> ESCALATED -> IN_PROGRESS", async () => {
    const start = await api("PUT", `/api/dm/reports/${reportId}/status`, {
      status: "IN_PROGRESS",
      dmId: dmAId,
    });
    assert.equal(start.status, 200, JSON.stringify(start.body));
    assert.equal(start.body.status, "IN_PROGRESS");

    const escape = await api("PUT", `/api/dm/reports/${reportId}/status`, {
      status: "ESCALATED",
      dmId: dmAId,
    });
    assert.equal(escape.status, 200);
    assert.equal((await getReport(reportId)).status, "ESCALATED");

    const back = await api("PUT", `/api/dm/reports/${reportId}/status`, {
      status: "IN_PROGRESS",
      dmId: dmAId,
    });
    assert.equal(back.status, 200);
    assert.equal((await getReport(reportId)).status, "IN_PROGRESS");
  });

  await t.test("DM cannot jump straight to RESOLVED from ASSIGNED", async () => {
    const pendingAssignment = await createReport(citizenId, "Dead tree");
    await api("PUT", `/api/admin/reports/${pendingAssignment}/status`, {
      status: "VERIFIED",
      adminId,
    });
    await api("POST", `/api/admin/reports/${pendingAssignment}/assign`, {
      adminId,
      dmId: dmAId,
      department: "Parks",
    });

    const jump = await api("PUT", `/api/dm/reports/${pendingAssignment}/status`, {
      status: "RESOLVED",
      dmId: dmAId,
    });
    assert.equal(jump.status, 409);
    assert.match(jump.body.error, /ASSIGNED.*RESOLVED|RESOLVED/);

    const verify = await api("PUT", `/api/admin/reports/${pendingAssignment}/status`, {
      status: "VERIFIED",
      adminId,
    });
    assert.equal(verify.status, 409, "admin cannot re-verify an assigned report");
  });

  await t.test("DM resolution records completion metadata", async () => {
    const res = await api("PUT", `/api/dm/reports/${reportId}/status`, {
      status: "RESOLVED",
      dmId: dmAId,
      notes: "  Bulb replaced and tested  ",
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.status, "RESOLVED");

    const stored = await getReport(reportId);
    assert.equal(stored.status, "RESOLVED");
    assert.equal(stored.resolved_by_dm_id.toString(), dmAId);
    assert.equal(stored.resolved_by_dm_name, "DM Alpha");
    assert.equal(stored.resolution_notes, "Bulb replaced and tested");
    assert.ok(stored.resolved_at instanceof Date, "completion timestamp recorded");
    assert.ok(stored.updated_at instanceof Date, "updated timestamp recorded");
    assert.ok(stored.resolved_at.getTime() <= stored.updated_at.getTime());
    assert.ok(stored.resolved_at.getTime() >= stored.assigned_at.getTime());
  });

  await t.test("resolution metadata is always present even without notes", async () => {
    const other = await createReport(citizenId, "Graffiti");
    await api("PUT", `/api/admin/reports/${other}/status`, { status: "VERIFIED", adminId });
    await api("POST", `/api/admin/reports/${other}/assign`, {
      adminId,
      dmId: dmAId,
      department: "Sanitation",
    });
    await api("PUT", `/api/dm/reports/${other}/status`, { status: "IN_PROGRESS", dmId: dmAId });
    await api("PUT", `/api/dm/reports/${other}/status`, { status: "RESOLVED", dmId: dmAId });

    const stored = await getReport(other);
    assert.equal(stored.status, "RESOLVED");
    assert.equal(stored.resolution_notes, "");
    assert.ok(stored.resolved_at instanceof Date);
    assert.equal(stored.resolved_by_dm_id.toString(), dmAId);
  });

  await t.test("resolved reports cannot be reopened by either actor", async () => {
    const dmReopen = await api("PUT", `/api/dm/reports/${reportId}/status`, {
      status: "IN_PROGRESS",
      dmId: dmAId,
    });
    assert.equal(dmReopen.status, 409);

    const adminReopen = await api("PUT", `/api/admin/reports/${reportId}/status`, {
      status: "VERIFIED",
      adminId,
    });
    assert.equal(adminReopen.status, 409);

    const adminResolve = await api("PUT", `/api/admin/reports/${reportId}/status`, {
      status: "RESOLVED",
      adminId,
    });
    assert.equal(adminResolve.status, 409);
  });

  await t.test("DM cannot verify, reject or assign", async () => {
    const pendingId = await createReport(citizenId, "Overflowing bin");

    const verify = await api("PUT", `/api/dm/reports/${pendingId}/status`, {
      status: "VERIFIED",
      dmId: dmAId,
    });
    assert.equal(verify.status, 403, "report is not assigned to this DM");

    const assign = await api("POST", `/api/admin/reports/${pendingId}/assign`, {
      adminId: dmAId,
      dmId: dmAId,
      department: "Sanitation",
    });
    assert.equal(assign.status, 400, "a DM ID is not a valid admin ID");
  });

  await t.test("citizen report list reflects the final status", async () => {
    const mine = await api("GET", `/api/user/reports/${citizenId}`);
    assert.equal(mine.status, 200);
    const statuses = Object.fromEntries(mine.body.reports.map((r) => [r.issue_title, r.status]));
    assert.equal(statuses["Pothole outside school"], "RESOLVED");
    assert.equal(statuses["Illegal dumping"], "REJECTED");
    assert.equal(statuses["Water logging"], "PENDING");
    for (const report of mine.body.reports) {
      assert.equal(report.status, report.status.toUpperCase(), "statuses are uppercase");
    }
  });

  await t.test("admin list exposes assignment and resolution details", async () => {
    const list = await api("GET", "/api/admin/reports");
    assert.equal(list.status, 200);
    const resolved = list.body.reports.find((r) => r.issue_title === "Pothole outside school");
    assert.equal(resolved.assigned_dm_name, "DM Alpha");
    assert.equal(resolved.department, "Sanitation");
    assert.equal(resolved.resolved_by_dm_name, "DM Alpha");
    assert.equal(resolved.resolution_notes, "Bulb replaced and tested");
    assert.ok(resolved.user && resolved.user.full_name, "citizen still attached");
  });

  await t.test("image upload validates the citizen before touching Python", async () => {
    const form = new FormData();
    form.append("image", new Blob([Buffer.from("not-a-real-image")], { type: "image/png" }), "shot.png");
    form.append("userId", "definitely-not-an-id");
    const badUser = await fetch(`${baseUrl}/api/upload-image`, {
      method: "POST",
      body: form,
      headers: { Cookie: sessions.citizen },
    });
    assert.equal(badUser.status, 400);
    const badUserBody = await badUser.json();
    assert.match(badUserBody.error, /Invalid user ID/i);

    const form2 = new FormData();
    form2.append("image", new Blob([Buffer.from("not-a-real-image")], { type: "image/png" }), "shot.png");
    form2.append("userId", new ObjectId().toString());
    const unknownUser = await fetch(`${baseUrl}/api/upload-image`, {
      method: "POST",
      body: form2,
      headers: { Cookie: sessions.citizen },
    });
    assert.equal(unknownUser.status, 400);
    const unknownUserBody = await unknownUser.json();
    assert.match(unknownUserBody.error, /User not found/i);
  });

  await t.test("legacy lowercase statuses in the database are normalised on read", async () => {
    await db.collection("user_reports").insertOne({
      user_id: citizenId,
      issue_title: "Legacy row",
      issue_category: "Other",
      issue_location: "Old Street",
      issue_description: "Created before the lifecycle work",
      reporting_method: "text",
      status: "Pending",
      priority: "Medium",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const mine = await api("GET", `/api/user/reports/${citizenId}`);
    const legacy = mine.body.reports.find((r) => r.issue_title === "Legacy row");
    assert.equal(legacy.status, "PENDING");

    const adminList = await api("GET", "/api/admin/reports");
    const adminLegacy = adminList.body.reports.find((r) => r.issue_title === "Legacy row");
    assert.equal(adminLegacy.status, "PENDING");
    assert.equal(adminLegacy.user.full_name, "Cita Zen", "string user_id still resolves");
  });

  await t.test("legacy string user_id rows are visible to their owner", async () => {
    await db.collection("user_reports").insertOne({
      user_id: "legacy-string-user",
      issue_title: "String id row",
      issue_category: "Other",
      issue_location: "Old Street",
      issue_description: "user_id stored as string",
      reporting_method: "text",
      status: "pending",
      priority: "Medium",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const list = await api("GET", "/api/admin/reports");
    const row = list.body.reports.find((r) => r.issue_title === "String id row");
    assert.ok(row, "string user_id report still listed");
    assert.equal(row.status, "PENDING");
    assert.ok(row.user && row.user.email == null, "unknown citizen yields empty user");
  });
});

after(async () => {
  if (httpServer) {
    // fetch() keeps connections alive, which would otherwise block close()
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
