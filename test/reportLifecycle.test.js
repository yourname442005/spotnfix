const test = require("node:test");
const assert = require("node:assert/strict");

const {
  STATUS,
  STATUS_VALUES,
  TRANSITIONS,
  ASSIGN_TRANSITION,
  canonicalStatus,
  normalizeReport,
  canTransition,
  transitionError,
  assignmentMetadata,
  resolutionMetadata,
} = require("../lib/reportLifecycle");

test("STATUS exposes canonical uppercase values", () => {
  assert.equal(STATUS.PENDING, "PENDING");
  assert.equal(STATUS.VERIFIED, "VERIFIED");
  assert.equal(STATUS.ASSIGNED, "ASSIGNED");
  assert.equal(STATUS.IN_PROGRESS, "IN_PROGRESS");
  assert.equal(STATUS.RESOLVED, "RESOLVED");
  assert.equal(STATUS.REJECTED, "REJECTED");
  assert.equal(STATUS.ESCALATED, "ESCALATED");
  for (const value of STATUS_VALUES) {
    assert.equal(value, value.toUpperCase());
  }
});

test("canonicalStatus normalizes legacy and sloppy input", () => {
  assert.equal(canonicalStatus("Pending"), "PENDING");
  assert.equal(canonicalStatus("pending"), "PENDING");
  assert.equal(canonicalStatus(" PENDING "), "PENDING");
  assert.equal(canonicalStatus("verified"), "VERIFIED");
  assert.equal(canonicalStatus("Assigned"), "ASSIGNED");
  assert.equal(canonicalStatus("in progress"), "IN_PROGRESS");
  assert.equal(canonicalStatus("In_Progress"), "IN_PROGRESS");
  assert.equal(canonicalStatus("in-progress"), "IN_PROGRESS");
  assert.equal(canonicalStatus("completed"), "RESOLVED");
  assert.equal(canonicalStatus("Completed"), "RESOLVED");
  assert.equal(canonicalStatus("done"), "RESOLVED");
  assert.equal(canonicalStatus("rejected"), "REJECTED");
  assert.equal(canonicalStatus("escalated"), "ESCALATED");
});

test("canonicalStatus returns null for unknown or missing values", () => {
  assert.equal(canonicalStatus("not-a-status"), null);
  assert.equal(canonicalStatus(""), null);
  assert.equal(canonicalStatus(null), null);
  assert.equal(canonicalStatus(undefined), null);
  assert.equal(canonicalStatus(42), null);
});

test("normalizeReport canonicalizes status and preserves other fields", () => {
  const input = {
    _id: "abc",
    issue_title: "Pothole",
    status: "Pending",
    priority: "Medium",
  };
  const out = normalizeReport(input);
  assert.equal(out.status, "PENDING");
  assert.equal(out.issue_title, "Pothole");
  assert.equal(out.priority, "Medium");
  assert.equal(input.status, "Pending", "input object is not mutated");
});

test("normalizeReport leaves unrecognised status untouched", () => {
  const out = normalizeReport({ status: "weird-value" });
  assert.equal(out.status, "weird-value");
});

test("normalizeReport handles missing status", () => {
  assert.equal(normalizeReport({}).status, undefined);
});

test("admin lifecycle: PENDING -> VERIFIED -> ASSIGNED is allowed", () => {
  assert.equal(canTransition("admin", "PENDING", "VERIFIED"), true);
  assert.equal(canTransition("admin", "VERIFIED", "ASSIGNED"), true);
});

test("admin lifecycle: reject is allowed from PENDING and VERIFIED only", () => {
  assert.equal(canTransition("admin", "PENDING", "REJECTED"), true);
  assert.equal(canTransition("admin", "VERIFIED", "REJECTED"), true);
  assert.equal(canTransition("admin", "ASSIGNED", "REJECTED"), false);
  assert.equal(canTransition("admin", "RESOLVED", "REJECTED"), false);
});

test("admin cannot perform DM-only transitions", () => {
  assert.equal(canTransition("admin", "ASSIGNED", "IN_PROGRESS"), false);
  assert.equal(canTransition("admin", "IN_PROGRESS", "RESOLVED"), false);
  assert.equal(canTransition("admin", "IN_PROGRESS", "ESCALATED"), false);
  assert.equal(canTransition("admin", "ESCALATED", "IN_PROGRESS"), false);
  assert.equal(canTransition("admin", "PENDING", "RESOLVED"), false);
  assert.equal(canTransition("admin", "PENDING", "ASSIGNED"), false, "only a VERIFIED report can be assigned");
  assert.equal(canTransition("admin", "VERIFIED", "ASSIGNED"), true, "assignable, but only via the assign endpoint");
});

test("DM lifecycle transitions", () => {
  assert.equal(canTransition("dm", "ASSIGNED", "IN_PROGRESS"), true);
  assert.equal(canTransition("dm", "IN_PROGRESS", "RESOLVED"), true);
  assert.equal(canTransition("dm", "IN_PROGRESS", "ESCALATED"), true);
  assert.equal(canTransition("dm", "ESCALATED", "IN_PROGRESS"), true);
});

test("DM cannot verify, reject, assign or start unassigned work", () => {
  assert.equal(canTransition("dm", "PENDING", "VERIFIED"), false);
  assert.equal(canTransition("dm", "PENDING", "REJECTED"), false);
  assert.equal(canTransition("dm", "VERIFIED", "ASSIGNED"), false);
  assert.equal(canTransition("dm", "PENDING", "IN_PROGRESS"), false);
  assert.equal(canTransition("dm", "VERIFIED", "IN_PROGRESS"), false);
});

test("terminal states and self transitions are rejected", () => {
  for (const status of STATUS_VALUES) {
    assert.equal(canTransition("admin", status, status), false, `admin self ${status}`);
    assert.equal(canTransition("dm", status, status), false, `dm self ${status}`);
  }
  assert.equal(canTransition("dm", "RESOLVED", "IN_PROGRESS"), false);
  assert.equal(canTransition("dm", "REJECTED", "PENDING"), false);
  assert.equal(canTransition("admin", "RESOLVED", "PENDING"), false);
});

test("assign transition is exactly VERIFIED -> ASSIGNED", () => {
  assert.deepEqual(ASSIGN_TRANSITION, { from: "VERIFIED", to: "ASSIGNED" });
});

test("unknown actor or unknown status is denied", () => {
  assert.equal(canTransition("citizen", "PENDING", "VERIFIED"), false);
  assert.equal(canTransition("admin", "NOT_A_STATUS", "VERIFIED"), false);
  assert.equal(canTransition("dm", "PENDING", "NOT_A_STATUS"), false);
});

test("transitionError explains why a transition is illegal", () => {
  assert.equal(transitionError("admin", "PENDING", "VERIFIED"), null);
  const err = transitionError("dm", "PENDING", "RESOLVED");
  assert.ok(err && err.length > 0);
  assert.match(err, /PENDING/);
  assert.match(err, /RESOLVED/);
  assert.match(err, /DM/i);
});

test("transitionError accepts canonicalisable legacy input", () => {
  assert.equal(transitionError("admin", "Pending", "Verified"), null);
});

test("assignmentMetadata records DM, department, admin and timestamps", () => {
  const now = new Date("2026-10-03T10:00:00.000Z");
  const meta = assignmentMetadata({
    dm: { _id: "dm-id", name: "Dm One" },
    admin: { _id: "admin-id", name: "Admin One" },
    department: "Sanitation",
    now,
  });
  assert.deepEqual(meta, {
    assigned_dm_id: "dm-id",
    assigned_dm_name: "Dm One",
    department: "Sanitation",
    assigned_by_admin_id: "admin-id",
    assigned_by_admin_name: "Admin One",
    assigned_at: now,
    updated_at: now,
  });
});

test("assignmentMetadata normalizes department whitespace", () => {
  const meta = assignmentMetadata({
    dm: { _id: "d", name: "n" },
    admin: { _id: "a", name: "m" },
    department: "  Roads & Drains  ",
    now: new Date(),
  });
  assert.equal(meta.department, "Roads & Drains");
});

test("assignmentMetadata rejects empty department", () => {
  assert.throws(
    () =>
      assignmentMetadata({
        dm: { _id: "d", name: "n" },
        admin: { _id: "a", name: "m" },
        department: "   ",
        now: new Date(),
      }),
    /department/i
  );
});

test("resolutionMetadata records completing DM, notes and timestamps", () => {
  const now = new Date("2026-10-03T12:30:00.000Z");
  const meta = resolutionMetadata({
    dm: { _id: "dm-id", name: "Dm One" },
    notes: "Pothole patched",
    now,
  });
  assert.deepEqual(meta, {
    resolved_by_dm_id: "dm-id",
    resolved_by_dm_name: "Dm One",
    resolution_notes: "Pothole patched",
    resolved_at: now,
    updated_at: now,
  });
});

test("resolutionMetadata defaults notes to empty string", () => {
  const meta = resolutionMetadata({ dm: { _id: "d", name: "n" }, now: new Date() });
  assert.equal(meta.resolution_notes, "");
  assert.ok(meta.resolved_at instanceof Date);
  assert.ok(meta.updated_at instanceof Date);
});

test("resolutionMetadata trims notes", () => {
  const meta = resolutionMetadata({
    dm: { _id: "d", name: "n" },
    notes: "  done  ",
    now: new Date(),
  });
  assert.equal(meta.resolution_notes, "done");
});

test("TRANSITIONS graph contains only known statuses", () => {
  const known = new Set(STATUS_VALUES);
  for (const [actor, map] of Object.entries(TRANSITIONS)) {
    for (const [from, targets] of Object.entries(map)) {
      assert.ok(known.has(from), `${actor} from ${from}`);
      for (const to of targets) {
        assert.ok(known.has(to), `${actor} ${from} -> ${to}`);
      }
    }
  }
});
