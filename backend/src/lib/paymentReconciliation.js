// backend/src/lib/paymentReconciliation.js
const prisma = require("../config/db");

//  DEBTOR STATUS HELPER
const calculateDebtorStatus = async (
  studentId,
  classId,
  schoolId,
  term,
  academicYear,
) => {
  const [feeStructure, paymentsAggregate] = await Promise.all([
    prisma.feeStructure.findFirst({
      where: { schoolId, classId, term, academicYear, isActive: true },
    }),
    prisma.feePayment.aggregate({
      where: { studentId, term, academicYear, status: "VERIFIED" },
      _sum: { amount: true },
    }),
  ]);

  const requiredAmount = feeStructure?.totalAmount || null;
  const totalPaid = paymentsAggregate._sum.amount || 0;
  const balance = requiredAmount !== null ? requiredAmount - totalPaid : null;
  const isDebtor = balance !== null ? balance > 0 : false;

  return { requiredAmount, totalPaid, balance, isDebtor };
};

/**
 * Runs the overpayment/credit-balance reconciliation for a payment that
 * has just been verified. Called from:
 *   1. Bursar verifies a manual payment (payment.controller.verifyPayment)
 *   2. Malipo webhook confirms an online payment
 *
 * Returns the updated balance/isDebtor for the verified payment.
 */
async function reconcileVerifiedPayment(payment) {
  const requiredAmount = payment.requiredAmount;

  if (requiredAmount !== null && requiredAmount !== undefined) {
    // Total verified for this student/term/year BEFORE this payment
    const beforeAgg = await prisma.feePayment.aggregate({
      where: {
        studentId: payment.studentId,
        term: payment.term,
        academicYear: payment.academicYear,
        status: "VERIFIED",
        id: { not: payment.id },
      },
      _sum: { amount: true },
    });
    const paidBefore = beforeAgg._sum.amount || 0;

    const totalPaid = paidBefore + payment.amount;
    const overpayBefore = Math.max(0, paidBefore - requiredAmount);
    const overpayAfter = Math.max(0, totalPaid - requiredAmount);
    const deltaOverpay = overpayAfter - overpayBefore;

    const balanceAfter = Math.max(0, requiredAmount - totalPaid);
    const isDebtor = balanceAfter > 0;

    if (deltaOverpay > 0) {
      await prisma.student.update({
        where: { id: payment.studentId },
        data: { creditBalance: { increment: deltaOverpay } },
      });
    }

    await prisma.feePayment.update({
      where: { id: payment.id },
      data: { overpayment: deltaOverpay },
    });

    await prisma.feePayment.updateMany({
      where: {
        studentId: payment.studentId,
        term: payment.term,
        academicYear: payment.academicYear,
        status: "VERIFIED",
      },
      data: { balance: balanceAfter, isDebtor },
    });

    return { balance: balanceAfter, isDebtor, overpayment: deltaOverpay };
  }

  // No fee structure set — just recalc debtor status
  const student = await prisma.student.findUnique({
    where: { id: payment.studentId },
    select: { classId: true },
  });

  const debtorStatus = await calculateDebtorStatus(
    payment.studentId,
    student.classId,
    payment.schoolId,
    payment.term,
    payment.academicYear,
  );

  await prisma.feePayment.updateMany({
    where: {
      studentId: payment.studentId,
      term: payment.term,
      academicYear: payment.academicYear,
      status: "VERIFIED",
    },
    data: {
      balance: debtorStatus.balance,
      isDebtor: debtorStatus.isDebtor,
    },
  });

  return {
    balance: debtorStatus.balance,
    isDebtor: debtorStatus.isDebtor,
    overpayment: 0,
  };
}

module.exports = { reconcileVerifiedPayment, calculateDebtorStatus };
