/*
 * Single source of truth for how the frontends talk to the SpotnFix backend.
 *
 * Loaded by every portal page via <script src="/shared/api-config.js"></script>.
 *
 * - API_BASE defaults to "" (root-relative), so requests go to whatever origin
 *   served the page. The backend serves all portals itself, which makes API
 *   calls same-origin on any port (5000, 5001, production, ...). Override by
 *   defining window.SPOTNFIX_API_BASE before this script loads.
 * - SPOTNFIX.fetch always sends credentials: "include" so the HttpOnly
 *   sih_session cookie rides along (required when frontends are ever served
 *   from a different origin than the API).
 * - SPOTNFIX.canonicalStatus mirrors lib/reportLifecycle.js so client-side
 *   filters/buttons compare against canonical uppercase statuses.
 */
(function (global) {
  "use strict";

  var API_BASE =
    typeof global.SPOTNFIX_API_BASE === "string"
      ? global.SPOTNFIX_API_BASE
      : "";

  var STATUS_ALIASES = {
    PENDING: "PENDING",
    VERIFIED: "VERIFIED",
    ASSIGNED: "ASSIGNED",
    IN_PROGRESS: "IN_PROGRESS",
    RESOLVED: "RESOLVED",
    REJECTED: "REJECTED",
    ESCALATED: "ESCALATED",
    COMPLETED: "RESOLVED",
    COMPLETE: "RESOLVED",
    DONE: "RESOLVED",
    CLOSED: "RESOLVED",
  };

  function canonicalStatus(value) {
    if (typeof value !== "string") return "";
    var key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
    return Object.prototype.hasOwnProperty.call(STATUS_ALIASES, key)
      ? STATUS_ALIASES[key]
      : key;
  }

  function api(path) {
    return API_BASE + path;
  }

  function apiFetch(path, init) {
    var options = init ? init : {};
    options.credentials = "include";
    return fetch(api(path), options);
  }

  global.SPOTNFIX = {
    API_BASE: API_BASE,
    api: api,
    fetch: apiFetch,
    canonicalStatus: canonicalStatus,
  };
})(window);
