const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const {
  pythonCandidates,
  resolvePythonExecutable,
  resetPythonCache,
} = require("../lib/python");

test("pythonCandidates never assumes the Windows `py` launcher off Windows", () => {
  const candidates = pythonCandidates(process.platform === "win32" ? "linux" : process.platform);
  if (process.platform !== "win32") {
    assert.ok(!candidates.includes("py"), "no `py` on non-Windows platforms");
  }
  assert.ok(candidates.length > 0);
});

test("pythonCandidates prefers python3 on darwin/linux", () => {
  const candidates = pythonCandidates("darwin");
  assert.equal(candidates[0], "python3");
  const win = pythonCandidates("win32");
  assert.equal(win[0], "py");
});

test("resolvePythonExecutable returns a working interpreter", () => {
  resetPythonCache();
  const exe = resolvePythonExecutable();
  assert.ok(typeof exe === "string" && exe.length > 0);
  const probe = spawnSync(exe, ["--version"], { encoding: "utf8" });
  assert.equal(probe.error, undefined, `probe failed: ${probe.error && probe.error.message}`);
  assert.equal(probe.status, 0, probe.stderr);
});

test("resolvePythonExecutable honours the PYTHON override", () => {
  resetPythonCache();
  process.env.PYTHON = "python3";
  try {
    const exe = resolvePythonExecutable();
    assert.equal(exe, "python3");
  } finally {
    delete process.env.PYTHON;
    resetPythonCache();
  }
});

test("resolvePythonExecutable throws a clear error when nothing is usable", () => {
  resetPythonCache();
  const saved = process.env.PYTHON;
  process.env.PYTHON = "definitely-not-a-real-python-binary-xyz";
  process.env.PYTHON_PATH = "also-not-real-python-xyz";
  try {
    assert.throws(() => resolvePythonExecutable(), /Python/i);
  } finally {
    if (saved === undefined) delete process.env.PYTHON;
    else process.env.PYTHON = saved;
    delete process.env.PYTHON_PATH;
    resetPythonCache();
  }
});

test("resolvePythonExecutable caches its resolution", () => {
  resetPythonCache();
  const first = resolvePythonExecutable();
  const second = resolvePythonExecutable();
  assert.equal(first, second);
  resetPythonCache();
});
