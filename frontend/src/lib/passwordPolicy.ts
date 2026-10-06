// frontend/src/lib/passwordPolicy.ts

// Same list as backend — keep in sync
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

export interface PasswordCheck {
  valid: boolean;
  errors: string[];
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
}

export const validatePassword = (password: string): PasswordCheck => {
  const errors: string[] = [];

  if (!password) {
    return {
      valid: false,
      errors: ["Password is required"],
      score: 0,
      label: "Very Weak",
    };
  }

  if (password.length < 8) errors.push("At least 8 characters");
  if (password.length > 128) errors.push("At most 128 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter (A-Z)");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter (a-z)");
  if (!/[0-9]/.test(password)) errors.push("One number (0-9)");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("One symbol (!@#$%...)");
  if (COMMON_PASSWORDS.has(password.toLowerCase()))
    errors.push("Password is too common");

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

  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    score = Math.min(score, 1) as 0 | 1 | 2 | 3 | 4;
  }

  const labels: PasswordCheck["label"][] = [
    "Very Weak",
    "Weak",
    "Fair",
    "Strong",
    "Very Strong",
  ];

  return {
    valid: errors.length === 0,
    errors,
    score: score as 0 | 1 | 2 | 3 | 4,
    label: labels[score],
  };
};

// UPDATED: added `short` labels for the compact meter
export const getRequirements = (password: string) => [
  {
    label: "At least 8 characters",
    short: "8+ chars",
    met: password.length >= 8,
  },
  {
    label: "One uppercase letter (A-Z)",
    short: "A-Z",
    met: /[A-Z]/.test(password),
  },
  {
    label: "One lowercase letter (a-z)",
    short: "a-z",
    met: /[a-z]/.test(password),
  },
  {
    label: "One number (0-9)",
    short: "0-9",
    met: /[0-9]/.test(password),
  },
  {
    label: "One symbol (!@#$%...)",
    short: "symbol",
    met: /[^A-Za-z0-9]/.test(password),
  },
  {
    label: "Not a common password",
    short: "not common",
    met: password.length > 0 && !COMMON_PASSWORDS.has(password.toLowerCase()),
  },
];
