// backend/src/lib/tokens.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// Access token: short-lived, sent with every request
const ACCESS_TTL = process.env.JWT_ACCESS_EXPIRES_IN || "30m";

// Refresh token: long-lived, used only to mint new access tokens
// After this window of inactivity, the user is logged out.
const REFRESH_TTL_HOURS = parseInt(
  process.env.JWT_REFRESH_EXPIRES_HOURS || "8",
  10,
);

const getAccessSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");
  return process.env.JWT_SECRET;
};

const getRefreshSecret = () => {
  if (!process.env.JWT_REFRESH_SECRET) {
    // Fall back to JWT_SECRET + suffix so nothing breaks if unset
    return `${process.env.JWT_SECRET}_refresh`;
  }
  return process.env.JWT_REFRESH_SECRET;
};

const signAccessToken = (payload) =>
  jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TTL });

const verifyAccessToken = (token) => jwt.verify(token, getAccessSecret());

const signRefreshToken = (staffId) =>
  jwt.sign({ id: staffId, type: "REFRESH" }, getRefreshSecret(), {
    expiresIn: `${REFRESH_TTL_HOURS}h`,
  });

const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, getRefreshSecret());
  if (decoded.type !== "REFRESH") throw new Error("Invalid token type");
  return decoded;
};

const hashToken = (token) => bcrypt.hash(token, 10);
const compareToken = (raw, hash) => bcrypt.compare(raw, hash);

const getRefreshExpiryDate = () =>
  new Date(Date.now() + REFRESH_TTL_HOURS * 60 * 60 * 1000);

module.exports = {
  ACCESS_TTL,
  REFRESH_TTL_HOURS,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
  getRefreshExpiryDate,
};
