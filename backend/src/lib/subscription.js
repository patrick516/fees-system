const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 7;
const READONLY_DAYS = 14; // beyond grace, before hard lock
const DEFAULT_TERM_DAYS = 90;

// Returns the effective end date currently in force for a school.
// Prefers subscriptionEndsAt if it's in the future, else trialEndsAt.
const getEffectiveEndDate = (school) => {
  const now = new Date();
  const sub = school.subscriptionEndsAt
    ? new Date(school.subscriptionEndsAt)
    : null;
  const trial = school.trialEndsAt ? new Date(school.trialEndsAt) : null;

  if (sub && sub > now) return sub;
  if (trial && trial > now) return trial;
  // Both in the past (or null) — return the most recent non-null
  if (sub && trial) return sub > trial ? sub : trial;
  return sub || trial || null;
};

// Days remaining until effective end date. Negative if already past.
const getDaysRemaining = (school) => {
  const end = getEffectiveEndDate(school);
  if (!end) return null;
  return Math.ceil((end.getTime() - Date.now()) / DAY_MS);
};

// Compute what the status SHOULD be based on dates, ignoring manual overrides.
// Returns one of: TRIAL, ACTIVE, GRACE, READONLY, LOCKED
const computeAutoStatus = (school) => {
  const now = Date.now();
  const sub = school.subscriptionEndsAt
    ? new Date(school.subscriptionEndsAt).getTime()
    : null;
  const trial = school.trialEndsAt
    ? new Date(school.trialEndsAt).getTime()
    : null;

  // Active paid period?
  if (sub && sub > now) return "ACTIVE";

  // In trial?
  if (!sub && trial && trial > now) return "TRIAL";
  if (trial && trial > now && (!sub || sub <= now)) return "TRIAL";

  // We're past the end. Compute milestones from the most recent end date.
  const end = Math.max(
    sub && sub <= now ? sub : 0,
    trial && trial <= now ? trial : 0,
  );
  if (!end) return school.subscriptionStatus; // no dates — leave as-is

  const daysOverdue = Math.floor((now - end) / DAY_MS);

  if (daysOverdue < GRACE_DAYS) return "GRACE";
  if (daysOverdue < READONLY_DAYS) return "READONLY";
  return "LOCKED";
};

// Given a school currently within its paid term or trial, compute the new end date
// when extending by N days. It will extend from the trial end date (if still in trial),
// or from the current subscription end date (if active), or from today (if expired).
const computeExtendedEnd = (school, daysToAdd = DEFAULT_TERM_DAYS) => {
  const now = new Date();

  const sub = school.subscriptionEndsAt
    ? new Date(school.subscriptionEndsAt)
    : null;
  const trial = school.trialEndsAt ? new Date(school.trialEndsAt) : null;

  // Find the latest valid future date to start counting from
  let base = now;
  if (sub && sub > now) {
    base = sub; // Extend from current paid subscription
  } else if (trial && trial > now) {
    base = trial;
  }

  return new Date(base.getTime() + daysToAdd * DAY_MS);
};

module.exports = {
  DAY_MS,
  GRACE_DAYS,
  READONLY_DAYS,
  DEFAULT_TERM_DAYS,
  getEffectiveEndDate,
  getDaysRemaining,
  computeAutoStatus,
  computeExtendedEnd,
};
