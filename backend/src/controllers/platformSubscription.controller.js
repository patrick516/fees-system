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
// GET /api/platform/subscriptions/analytics
const getAnalytics = async (req, res) => {
  try {
    // 1. Total Revenue
    const payments = await prisma.subscriptionPayment.findMany({
      where: {
        status: "VERIFIED",
        school: { platformId: req.platformId },
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Revenue by method
    const onekhusaRevenue = payments
      .filter((p) => p.method === "ONEKHUSA")
      .reduce((sum, p) => sum + p.amount, 0);
    const manualRevenue = payments
      .filter((p) => p.method === "MANUAL")
      .reduce((sum, p) => sum + p.amount, 0);

    // 2. At-Risk Schools (Grace, Readonly, Locked)
    const atRiskSchools = await prisma.school.findMany({
      where: {
        platformId: req.platformId,
        subscriptionStatus: { in: ["GRACE", "READONLY", "LOCKED"] },
      },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        trialEndsAt: true,
      },
    });

    // 3. Loyal Payers (Active schools with multiple payments)
    // We count payments per school to find the most loyal ones
    const activeSchools = await prisma.school.findMany({
      where: {
        platformId: req.platformId,
        subscriptionStatus: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { subscriptionPayments: { where: { status: "VERIFIED" } } },
        },
      },
    });

    // Sort by most payments
    const loyalPayers = activeSchools
      .filter((s) => s._count.subscriptionPayments > 0)
      .sort(
        (a, b) => b._count.subscriptionPayments - a._count.subscriptionPayments,
      )
      .slice(0, 5); // Top 5

    // 4. Recent Transactions
    const recentTransactions = await prisma.subscriptionPayment.findMany({
      where: {
        status: "VERIFIED",
        school: { platformId: req.platformId },
      },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: {
        school: { select: { name: true } },
      },
    });

    const platform = await prisma.platform.findFirst({
      select: { currency: true },
    });

    return res.json({
      success: true,
      data: {
        currency: platform?.currency || "MWK",
        stats: {
          totalRevenue,
          onekhusaRevenue,
          manualRevenue,
          totalPayments: payments.length,
        },
        atRiskSchools,
        loyalPayers,
        recentTransactions,
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
