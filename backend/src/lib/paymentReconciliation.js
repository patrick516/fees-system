const prisma = require("../config/db");

const calculateDebtorStatus = async (
  client,
  studentId,
  classId,
  schoolId,
  term,
  academicYear,
) => {
  const [feeStructure, paymentsAggregate] = await Promise.all([
    client.feeStructure.findFirst({
      where: { schoolId, classId, term, academicYear, isActive: true },
    }),
    client.feePayment.aggregate({
      where: { studentId, term, academicYear, status: "VERIFIED" },
      _sum: { amount: true },
    }),
  ]);

  const requiredAmount = feeStructure?.totalAmount
    ? Number(feeStructure.totalAmount)
    : null;
  const totalPaid = Number(paymentsAggregate._sum.amount) || 0;
  const balance = requiredAmount !== null ? requiredAmount - totalPaid : null;
  const isDebtor = balance !== null ? balance > 0 : false;

  return { requiredAmount, totalPaid, balance, isDebtor };
};

const reconcileVerifiedPayment = async (client, payment) => {
  const requiredAmount = payment.requiredAmount
    ? Number(payment.requiredAmount)
    : null;

  if (requiredAmount !== null) {
    const beforeAgg = await client.feePayment.aggregate({
      where: {
        studentId: payment.studentId,
        term: payment.term,
        academicYear: payment.academicYear,
        status: "VERIFIED",
        id: { not: payment.id },
      },
      _sum: { amount: true },
    });
    const paidBefore = Number(beforeAgg._sum.amount) || 0;
    const totalPaid = paidBefore + Number(payment.amount);
    const overpayBefore = Math.max(0, paidBefore - requiredAmount);
    const overpayAfter = Math.max(0, totalPaid - requiredAmount);
    const deltaOverpay = overpayAfter - overpayBefore;

    const balanceAfter = Math.max(0, requiredAmount - totalPaid);
    const isDebtor = balanceAfter > 0;

    if (deltaOverpay > 0) {
      await client.student.update({
        where: { id: payment.studentId },
        data: { creditBalance: { increment: deltaOverpay } },
      });
    }

    await client.feePayment.update({
      where: { id: payment.id },
      data: { overpayment: deltaOverpay },
    });

    await client.feePayment.updateMany({
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
  const student = await client.student.findUnique({
    where: { id: payment.studentId },
    select: { classId: true },
  });

  const debtorStatus = await calculateDebtorStatus(
    client,
    payment.studentId,
    student.classId,
    payment.schoolId,
    payment.term,
    payment.academicYear,
  );

  await client.feePayment.updateMany({
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
};

module.exports = { reconcileVerifiedPayment, calculateDebtorStatus };
