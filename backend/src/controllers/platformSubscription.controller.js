const prisma = require("../config/db");
const {
  getDaysRemaining,
  getEffectiveEndDate,
  computeExtendedEnd,
  DEFAULT_TERM_DAYS,
} = require("../lib/subscription");

//  LIST ALL SUBSCRIPTIONS (owner)
// GET /api/platform/subscriptions
const listSubscriptions = async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      where: { platformId: req.platformId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        setupCompleted: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        createdAt: true,
        _count: { select: { students: true } },
      },
    });

    const platform = await prisma.platform.findFirst({
      select: {
        defaultTermPrice: true,
        currency: true,
        defaultTrialDays: true,
      },
    });

    const data = schools.map(({ _count, ...s }) => ({
      ...s,
      studentCount: _count.students,
      daysRemaining: getDaysRemaining(s),
      effectiveEndDate: getEffectiveEndDate(s),
      termPrice: platform?.defaultTermPrice || 0,
      currency: platform?.currency || "MWK",
    }));

    return res.json({
      success: true,
      data: {
        schools: data,
        defaults: {
          termPrice: platform?.defaultTermPrice || 0,
          currency: platform?.currency || "MWK",
          defaultTrialDays: platform?.defaultTrialDays || 30,
          defaultTermDays: DEFAULT_TERM_DAYS,
        },
      },
    });
  } catch (err) {
    console.error("listSubscriptions error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list subscriptions" });
  }
};

// ==================== MARK PAID MANUALLY (owner) ====================
// POST /api/platform/subscriptions/:schoolId/mark-paid
// Body: { term, academicYear, amount?, daysToAdd?, notes? }
const markPaid = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const {
      term,
      academicYear,
      amount,
      daysToAdd = DEFAULT_TERM_DAYS,
      notes,
    } = req.body;

    if (!term || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "term and academicYear are required",
      });
    }

    const school = await prisma.school.findFirst({
      where: { id: schoolId, platformId: req.platformId },
    });
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const platform = await prisma.platform.findFirst({
      select: { defaultTermPrice: true, currency: true },
    });

    const days = Number.isFinite(Number(daysToAdd))
      ? Math.max(1, Number(daysToAdd))
      : DEFAULT_TERM_DAYS;

    const paymentAmount =
      amount !== undefined ? Number(amount) : platform?.defaultTermPrice || 0;

    const newEnd = computeExtendedEnd(school, days);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.subscriptionPayment.create({
        data: {
          schoolId: school.id,
          amount: paymentAmount,
          currency: platform?.currency || "MWK",
          term,
          academicYear,
          method: "MANUAL",
          status: "VERIFIED",
          paidAt: new Date(),
          markedById: req.platformAdmin.id,
          notes: notes || null,
        },
      });

      const updated = await tx.school.update({
        where: { id: school.id },
        data: {
          subscriptionStatus: "ACTIVE",
          subscriptionEndsAt: newEnd,
          // Clear trial if we're now on a paid plan
          trialEndsAt: null,
        },
      });

      return { payment, school: updated };
    });

    return res.json({
      success: true,
      message: "Marked as paid. Subscription extended.",
      data: {
        schoolId: result.school.id,
        subscriptionStatus: result.school.subscriptionStatus,
        subscriptionEndsAt: result.school.subscriptionEndsAt,
        daysAdded: days,
        payment: {
          id: result.payment.id,
          amount: result.payment.amount,
          term: result.payment.term,
          academicYear: result.payment.academicYear,
        },
      },
    });
  } catch (err) {
    console.error("markPaid error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to mark as paid" });
  }
};

const extendTrial = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { days } = req.body;

    const school = await prisma.school.findFirst({
      where: { id: schoolId, platformId: req.platformId },
    });
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    // Allow positive or negative numbers. If not a number, default to 0.
    const n = Number(days) || 0;

    // Base date: if trial is in the future, add/subtract from there.
    // Otherwise, start from today.
    const base =
      school.trialEndsAt && new Date(school.trialEndsAt) > new Date()
        ? new Date(school.trialEndsAt)
        : new Date();

    const newTrialEnd = new Date(base.getTime() + n * 24 * 60 * 60 * 1000);

    await prisma.school.update({
      where: { id: school.id },
      data: {
        trialEndsAt: newTrialEnd,
        subscriptionStatus: "TRIAL", // Reset to trial if they were in grace/locked
      },
    });

    return res.json({
      success: true,
      message: `Trial adjusted by ${n} days`,
      data: { trialEndsAt: newTrialEnd },
    });
  } catch (err) {
    console.error("extendTrial error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to adjust trial" });
  }
};

//  PAYMENT HISTORY (owner)
// GET /api/platform/subscriptions/:schoolId/history
const getPaymentHistory = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await prisma.school.findFirst({
      where: { id: schoolId, platformId: req.platformId },
      select: { id: true, name: true },
    });
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const payments = await prisma.subscriptionPayment.findMany({
      where: { schoolId: school.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        term: true,
        academicYear: true,
        method: true,
        status: true,
        paidAt: true,
        notes: true,
        createdAt: true,
        markedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return res.json({
      success: true,
      data: { school, payments },
    });
  } catch (err) {
    console.error("getPaymentHistory error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load history" });
  }
};

// ==================== PLATFORM ANALYTICS ====================
const getAnalytics = async (req, res) => {
  try {
    // 1. Fetch Platform Defaults
    const platform = await prisma.platform.findFirst({
      select: { defaultTermPrice: true, currency: true },
    });
    const expectedAmount = platform?.defaultTermPrice || 0;
    const currency = platform?.currency || "MWK";

    // 2. Fetch All Payments
    const payments = await prisma.subscriptionPayment.findMany({
      where: { status: "VERIFIED", school: { platformId: req.platformId } },
      orderBy: { paidAt: "desc" },
      include: { school: { select: { name: true } } },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const onekhusaRevenue = payments
      .filter((p) => p.method === "ONEKHUSA")
      .reduce((sum, p) => sum + p.amount, 0);
    const manualRevenue = payments
      .filter((p) => p.method === "MANUAL")
      .reduce((sum, p) => sum + p.amount, 0);

    // 3. Fetch Schools & calculate their payment health for current term
    const schools = await prisma.school.findMany({
      where: { platformId: req.platformId },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        activeTerm: true,
        activeAcademicYear: true,
        subscriptionPayments: {
          where: { status: "VERIFIED" },
          select: { amount: true, term: true, academicYear: true },
        },
      },
    });

    let fullyPaidCount = 0;
    let partiallyPaidCount = 0;
    let unpaidCount = 0;
    const partialSchools = [];
    const unpaidSchools = [];

    for (const school of schools) {
      // If they don't have an active term yet, they are technically unpaid for the term
      const term = school.activeTerm || "TERM_1";
      const year = school.activeAcademicYear || "2026-2027";

      // Sum payments for THIS specific term and academic year
      const paidThisTerm = school.subscriptionPayments
        .filter((p) => p.term === term && p.academicYear === year)
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = Math.max(0, expectedAmount - paidThisTerm);

      if (paidThisTerm >= expectedAmount && expectedAmount > 0) {
        fullyPaidCount++;
      } else if (paidThisTerm > 0) {
        partiallyPaidCount++;
        partialSchools.push({
          id: school.id,
          name: school.name,
          term,
          academicYear: year,
          paid: paidThisTerm,
          balance,
        });
      } else {
        unpaidCount++;
        unpaidSchools.push({
          id: school.id,
          name: school.name,
          term,
          academicYear: year,
          status: school.subscriptionStatus,
        });
      }
    }

    // 4. At-Risk Schools (Status based)
    const atRiskSchools = schools.filter((s) =>
      ["GRACE", "READONLY", "LOCKED"].includes(s.subscriptionStatus),
    );

    return res.json({
      success: true,
      data: {
        currency,
        expectedAmount,
        stats: {
          totalRevenue,
          onekhusaRevenue,
          manualRevenue,
          totalPayments: payments.length,
          fullyPaidCount,
          partiallyPaidCount,
          unpaidCount,
        },
        partialSchools,
        unpaidSchools,
        atRiskSchools,
        recentTransactions: payments.slice(0, 10),
      },
    });
  } catch (err) {
    console.error("getAnalytics error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load analytics" });
  }
};
module.exports = {
  listSubscriptions,
  markPaid,
  extendTrial,
  getPaymentHistory,
  getAnalytics,
};
