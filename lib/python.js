"use strict";

const { spawnSync } = require("child_process");

// The Windows launcher (`py`) does not exist on macOS/Linux, so candidates are
// platform specific. PYTHON / PYTHON_PATH always win when set.
function pythonCandidates(platform = process.platform, env = process.env) {
  const overrides = [env.PYTHON, env.PYTHON_PATH].filter(Boolean);
  // An explicit interpreter choice is authoritative: fail loudly rather than
  // silently falling back to a different Python.
  if (overrides.length > 0) return [...new Set(overrides)];

  const candidates = [];
  if (platform === "win32") {
    candidates.push("py", "python");
  } else {
    candidates.push("python3", "python");
  }
  return [...new Set(candidates)];
}

function probe(executable, code) {
  try {
    const result = spawnSync(executable, ["-c", code], { encoding: "utf8", timeout: 15000 });
    return !result.error && result.status === 0;
  } catch {
    return false;
  }
}

let cachedExecutable = null;

function resolvePythonExecutable() {
  if (cachedExecutable) return cachedExecutable;

  const candidates = pythonCandidates();
  let runnable = null;

  for (const candidate of candidates) {
    // Preferred: an interpreter that can actually run process.py
    // (PIL's native extension must load, not merely be importable).
    if (probe(candidate, "from PIL import Image; import pymongo")) {
      cachedExecutable = candidate;
      return candidate;
    }
    // Fallback: any interpreter that starts at all.
    if (runnable === null && probe(candidate, "import sys")) {
      runnable = candidate;
    }
  }

  if (runnable) {
    cachedExecutable = runnable;
    return runnable;
  }

  throw new Error(
    "No usable Python interpreter found. Install Python 3 with Pillow and pymongo, " +
      "or set the PYTHON environment variable to its path."
  );
}

function resetPythonCache() {
  cachedExecutable = null;
}

module.exports = {
  pythonCandidates,
  resolvePythonExecutable,
  resetPythonCache,
};
