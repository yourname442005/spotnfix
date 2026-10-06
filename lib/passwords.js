"use strict";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const BCRYPT_ROUNDS = 10;
const BCRYPT_PREFIX = /^\$2[aby]\$/;

function isHashedPassword(stored) {
  return typeof stored === "string" && BCRYPT_PREFIX.test(stored);
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), BCRYPT_ROUNDS);
}

function safeEqual(plain, stored) {
  const a = Buffer.from(String(plain), "utf8");
  const b = Buffer.from(String(stored), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verifies a password against a stored value.
 * Supports bcrypt hashes (admin/dm and new users) as well as legacy
 * plaintext records created before hashing was enabled.
 */
async function verifyPassword(password, stored) {
  if (typeof password !== "string" || typeof stored !== "string") return false;
  if (isHashedPassword(stored)) {
    return bcrypt.compare(password, stored);
  }
  return safeEqual(password, stored);
}

module.exports = {
  BCRYPT_ROUNDS,
  hashPassword,
  isHashedPassword,
  verifyPassword,
};
