// backend/src/lib/subscriptionCron.js
// Daily sweep: transitions schools between TRIAL → ACTIVE → GRACE →
// READONLY → LOCKED based on their dates. Never touches SUSPENDED.
const prisma = require("../config/db");
const { computeAutoStatus } = require("./subscription");

const sweepSubscriptions = async () => {
  const schools = await prisma.school.findMany({
    where: {
      isActive: true,
      // Don't touch manually suspended schools
      subscriptionStatus: { not: "SUSPENDED" },
    },
    select: {
      id: true,
      name: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
  });

  let updated = 0;
  for (const s of schools) {
    const auto = computeAutoStatus(s);
    if (auto && auto !== s.subscriptionStatus) {
      await prisma.school.update({
        where: { id: s.id },
        data: { subscriptionStatus: auto },
      });
      console.log(`[sub-cron] ${s.name}: ${s.subscriptionStatus} → ${auto}`);
      updated++;
    }
  }

  if (updated > 0) {
    console.log(`[sub-cron] Swept ${updated} school(s)`);
  }
  return updated;
};

module.exports = { sweepSubscriptions };
