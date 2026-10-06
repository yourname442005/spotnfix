const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hashPassword,
  isHashedPassword,
  verifyPassword,
} = require("../lib/passwords");

test("hashPassword produces a bcrypt hash that verifies", async () => {
  const hash = await hashPassword("s3cret!");
  assert.ok(isHashedPassword(hash));
  assert.notEqual(hash, "s3cret!");
  assert.equal(await verifyPassword("s3cret!", hash), true);
});

test("hashPassword never returns the plaintext", async () => {
  const hash = await hashPassword("hunter2");
  assert.ok(!hash.includes("hunter2"));
});

test("verifyPassword rejects a wrong password", async () => {
  const hash = await hashPassword("correct");
  assert.equal(await verifyPassword("wrong", hash), false);
});

test("verifyPassword supports legacy plaintext records", async () => {
  assert.equal(await verifyPassword("legacy-pass", "legacy-pass"), true);
  assert.equal(await verifyPassword("legacy-pass", "other-pass"), false);
});

test("verifyPassword handles legacy empty password", async () => {
  assert.equal(await verifyPassword("", ""), true);
  assert.equal(await verifyPassword("x", ""), false);
  assert.equal(await verifyPassword("", "x"), false);
});

test("verifyPassword rejects non-string stored values", async () => {
  assert.equal(await verifyPassword("x", null), false);
  assert.equal(await verifyPassword("x", undefined), false);
  assert.equal(await verifyPassword("x", { hash: "x" }), false);
});

test("verifyPassword returns false for a malformed bcrypt hash", async () => {
  assert.equal(await verifyPassword("x", "$2a$10$notarealhash"), false);
});

test("isHashedPassword recognises bcrypt prefixes only", () => {
  assert.equal(isHashedPassword("$2a$10$abcdefghijklmnopqrstuv"), true);
  assert.equal(isHashedPassword("$2b$10$abcdefghijklmnopqrstuv"), true);
  assert.equal(isHashedPassword("$2y$10$abcdefghijklmnopqrstuv"), true);
  assert.equal(isHashedPassword("plain"), false);
  assert.equal(isHashedPassword(""), false);
  assert.equal(isHashedPassword(null), false);
});

test("passwords needing upgrade are detected", async () => {
  const legacy = "oldPassword123";
  assert.equal(isHashedPassword(legacy), false);
  const upgraded = await hashPassword(legacy);
  assert.equal(isHashedPassword(upgraded), true);
  assert.equal(await verifyPassword(legacy, upgraded), true);
});
