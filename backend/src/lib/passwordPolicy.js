// backend/src/lib/passwordPolicy.js
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "12345678",
  "qwerty123",
  "letmein1",
  "welcome1",
  "admin123",
  "iloveyou",
  "monkey123",
  "dragon123",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "abcd1234",
]);

/**
 * Validate a password against the strong policy.
 * Returns { valid: boolean, errors: string[], score: 0-4 }
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password || typeof password !== "string") {
    return { valid: false, errors: ["Password is required"], score: 0 };
  }

  if (password.length < 8) errors.push("Must be at least 8 characters");
  if (password.length > 128) errors.push("Must be at most 128 characters");
  if (!/[A-Z]/.test(password)) errors.push("Must contain an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Must contain a lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Must contain a number");
  if (!/[^A-Za-z0-9]/.test(password))
    errors.push("Must contain a symbol (!@#$...)");
  if (COMMON_PASSWORDS.has(password.toLowerCase()))
    errors.push("This password is too common");

  // Strength score (0–4)
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  )
    score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score > 4) score = 4;

  return { valid: errors.length === 0, errors, score };
};

module.exports = { validatePassword };
