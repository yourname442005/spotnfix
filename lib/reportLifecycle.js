"use strict";

const STATUS = Object.freeze({
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
  ESCALATED: "ESCALATED",
});

const STATUS_VALUES = Object.freeze(Object.values(STATUS));

// Legacy / display spellings mapped onto the canonical uppercase statuses.
const STATUS_ALIASES = Object.freeze({
  PENDING: STATUS.PENDING,
  VERIFIED: STATUS.VERIFIED,
  ASSIGNED: STATUS.ASSIGNED,
  IN_PROGRESS: STATUS.IN_PROGRESS,
  RESOLVED: STATUS.RESOLVED,
  REJECTED: STATUS.REJECTED,
  ESCALATED: STATUS.ESCALATED,
  COMPLETED: STATUS.RESOLVED,
  COMPLETE: STATUS.RESOLVED,
  DONE: STATUS.RESOLVED,
  CLOSED: STATUS.RESOLVED,
});

// Allowed transitions per actor. ASSIGNMENT is deliberately restricted to the
// dedicated assign endpoint so assignment metadata is always recorded.
const TRANSITIONS = Object.freeze({
  admin: Object.freeze({
    [STATUS.PENDING]: Object.freeze([STATUS.VERIFIED, STATUS.REJECTED]),
    [STATUS.VERIFIED]: Object.freeze([STATUS.REJECTED, STATUS.ASSIGNED]),
    [STATUS.ASSIGNED]: Object.freeze([]),
    [STATUS.IN_PROGRESS]: Object.freeze([]),
    [STATUS.RESOLVED]: Object.freeze([]),
    [STATUS.REJECTED]: Object.freeze([]),
    [STATUS.ESCALATED]: Object.freeze([]),
  }),
  dm: Object.freeze({
    [STATUS.PENDING]: Object.freeze([]),
    [STATUS.VERIFIED]: Object.freeze([]),
    [STATUS.ASSIGNED]: Object.freeze([STATUS.IN_PROGRESS]),
    [STATUS.IN_PROGRESS]: Object.freeze([STATUS.RESOLVED, STATUS.ESCALATED]),
    [STATUS.RESOLVED]: Object.freeze([]),
    [STATUS.REJECTED]: Object.freeze([]),
    [STATUS.ESCALATED]: Object.freeze([STATUS.IN_PROGRESS]),
  }),
});

const ASSIGN_TRANSITION = Object.freeze({ from: STATUS.VERIFIED, to: STATUS.ASSIGNED });

function normalizeKey(value) {
  if (typeof value !== "string") return null;
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return key.length > 0 ? key : null;
}

function canonicalStatus(value) {
  const key = normalizeKey(value);
  if (!key) return null;
  return Object.prototype.hasOwnProperty.call(STATUS_ALIASES, key) ? STATUS_ALIASES[key] : null;
}

function normalizeReport(report) {
  if (!report || typeof report !== "object") return report;
  const canonical = canonicalStatus(report.status);
  if (canonical === null || canonical === report.status) return { ...report };
  return { ...report, status: canonical };
}

function canTransition(actor, from, to) {
  const actorKey = typeof actor === "string" ? actor.trim().toLowerCase() : null;
  const map = TRANSITIONS[actorKey];
  if (!map) return false;
  const fromStatus = canonicalStatus(from);
  const toStatus = canonicalStatus(to);
  if (!fromStatus || !toStatus) return false;
  const allowed = map[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

function transitionError(actor, from, to) {
  const fromStatus = canonicalStatus(from);
  const toStatus = canonicalStatus(to);
  if (fromStatus && toStatus && canTransition(actor, fromStatus, toStatus)) return null;

  const actorLabel = actor === "admin" ? "Admin" : actor === "dm" ? "DM" : String(actor);
  if (!fromStatus || !toStatus) {
    return `Unknown status transition: ${from == null ? from : from} -> ${
      to == null ? to : to
    }`;
  }
  return `${actorLabel} cannot move a report from ${fromStatus} to ${toStatus}`;
}

function assignmentMetadata({ dm, admin, department, now = new Date() }) {
  const trimmedDepartment = typeof department === "string" ? department.trim() : "";
  if (!trimmedDepartment) {
    throw new Error("department is required to assign a report");
  }
  if (!dm || !admin) {
    throw new Error("dm and admin are required to assign a report");
  }
  return {
    assigned_dm_id: dm._id,
    assigned_dm_name: dm.name || "",
    department: trimmedDepartment,
    assigned_by_admin_id: admin._id,
    assigned_by_admin_name: admin.name || "",
    assigned_at: now,
    updated_at: now,
  };
}

function resolutionMetadata({ dm, notes, now = new Date() }) {
  if (!dm) {
    throw new Error("dm is required to resolve a report");
  }
  return {
    resolved_by_dm_id: dm._id,
    resolved_by_dm_name: dm.name || "",
    resolution_notes: typeof notes === "string" ? notes.trim() : "",
    resolved_at: now,
    updated_at: now,
  };
}

module.exports = {
  STATUS,
  STATUS_VALUES,
  STATUS_ALIASES,
  TRANSITIONS,
  ASSIGN_TRANSITION,
  canonicalStatus,
  normalizeReport,
  canTransition,
  transitionError,
  assignmentMetadata,
  resolutionMetadata,
};
