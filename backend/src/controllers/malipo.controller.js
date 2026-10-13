const prisma = require("../config/db");
const malipo = require("../lib/malipo");
const { reconcileVerifiedPayment } = require("../lib/paymentReconciliation");
const { sendNotifications } = require("../lib/notifier");

const MIN_AMOUNT = 50; // MWK — confirmed from Malipo
const STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes

//  INITIATE ONLINE PAYMENT
// POST /api/payments/malipo/initiate
// Body: { studentId, amount, method: "AIRTEL" | "MPAMBA", phone, term, academicYear }
const initiatePayment = async (req, res) => {
  try {
    const { studentId, amount, method, phone, term, academicYear } = req.body;

    if (!studentId || !amount || !method || !phone || !term) {
      return res.status(400).json({
        success: false,
        message: "studentId, amount, method, phone and term are required",
      });
    }

    if (!["AIRTEL", "MPAMBA"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "method must be AIRTEL or MPAMBA",
      });
    }

    if (Number(amount) < MIN_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Minimum amount is MWK ${MIN_AMOUNT}`,
      });
    }

    // Parent can only pay for their own child
    if (req.student && req.student.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only pay for your own child",
      });
    }

    // Get the student + fee structure
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.schoolId || req.student.schoolId },
      include: { school: true, class: true },
    });

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const year = academicYear || student.school.activeAcademicYear;
    if (!year) {
      return res
        .status(400)
        .json({ success: false, message: "Academic year is required" });
    }

    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: student.schoolId,
        classId: student.classId,
        term,
        academicYear: year,
        isActive: true,
      },
    });

    // Create the payment record as PENDING + MALIPO channel
    const paymentCount = await prisma.feePayment.count({
      where: { schoolId: student.schoolId },
    });
    const { generateReceiptNumber } = require("../lib/utils");
    const receiptNumber = generateReceiptNumber(year, paymentCount + 1);

    const payment = await prisma.feePayment.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        amount: parseFloat(amount),
        paymentMethod: method === "AIRTEL" ? "AIRTEL_MONEY" : "TNM_MPAMBA",
        term,
        academicYear: year,
        receiptNumber,
        submittedBy: "PARENT",
        status: "PENDING",
        parentPhone: phone,
        requiredAmount: feeStructure?.totalAmount || null,
        paymentChannel: "MALIPO",
        malipoStatus: "Processing",
      },
    });

    // Fire the payment request to Malipo
    try {
      const result = await malipo.requestPayment({
        method,
        merchantTrxId: payment.id,
        customerPhone: phone,
        amount: Number(amount),
      });

      // Save Malipo's transaction ID
      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          malipoTransactionId: result?.keys?.transaction_id || null,
        },
      });

      return res.status(202).json({
        success: true,
        awaitingConfirmation: true,
        message: "Check your phone to complete the payment.",
        data: {
          paymentId: payment.id,
          receiptNumber,
          status: "Processing",
        },
      });
    } catch (paymentErr) {
      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: "REJECTED",
          malipoStatus: "Failed",
          malipoFailureReason: `Could not start payment: ${paymentErr.message}`,
        },
      });

      return res.status(502).json({
        success: false,
        message: "Payment provider error — please try again",
      });
    }
  } catch (err) {
    console.error("Malipo initiate error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to initiate payment" });
  }
};

//  WEBHOOK
// POST /api/payments/malipo/webhook
// Called by Malipo when the parent finishes / abandons the USSD prompt.
const webhook = async (req, res) => {
  try {
    const { status, merchant_txn_id, customer_ref, transaction_id } = req.body;

    if (!merchant_txn_id || !["Completed", "Failed"].includes(status)) {
      console.error("[malipo] Malformed webhook payload:", req.body);
      return res.sendStatus(400);
    }

    const payment = await prisma.feePayment.findUnique({
      where: { id: merchant_txn_id },
      include: {
        student: {
          select: {
            fullName: true,
            parentPhone: true,
            parentEmail: true,
            parentName: true,
          },
        },
      },
    });

    if (!payment) {
      console.error("[malipo] Unknown payment for order:", merchant_txn_id);
      return res.sendStatus(200); // ACK anyway so Malipo doesn't retry
    }

    // Idempotency: only resolve if still PENDING
    if (payment.status !== "PENDING") {
      return res.sendStatus(200);
    }

    if (status === "Completed") {
      // Mark verified, then reconcile balance/credit
      await prisma.feePayment.update({
        where: { id: merchant_txn_id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          malipoStatus: "Completed",
          malipoCustomerRef: customer_ref || null,
          malipoTransactionId: transaction_id || null,
          malipoRawResponse: req.body,
        },
      });

      const refreshed = await prisma.feePayment.findUnique({
        where: { id: merchant_txn_id },
      });
      const reconcile = await reconcileVerifiedPayment(refreshed);

      // Send confirmation notification
      const school = await prisma.school.findUnique({
        where: { id: payment.schoolId },
        select: { name: true, notificationDefaults: true },
      });

      const message =
        `Payment of MWK ${payment.amount.toLocaleString()} received for ${payment.student.fullName}. ` +
        `Receipt: ${payment.receiptNumber}.` +
        (reconcile.balance > 0
          ? ` Balance: MWK ${reconcile.balance.toLocaleString()}`
          : " Fully paid!");

      sendNotifications({
        recipients: [
          {
            phone: payment.student.parentPhone,
            email: payment.student.parentEmail,
            name: payment.student.parentName || "Parent",
            message,
            subject: `Payment Received — ${school.name}`,
            templateData: {
              studentName: payment.student.fullName,
              amount: payment.amount,
              receiptNumber: payment.receiptNumber,
              balanceAfter: reconcile.balance,
              overpayment: reconcile.overpayment,
            },
          },
        ],
        channel: school?.notificationDefaults?.defaultChannel || "BOTH",
        type: "payment_verified",
        templateKey: "payment_verified",
        schoolId: payment.schoolId,
        schoolName: school.name,
      }).catch((e) => console.error("Malipo notif error:", e));
    } else {
      // Failed
      await prisma.feePayment.update({
        where: { id: merchant_txn_id },
        data: {
          status: "REJECTED",
          malipoStatus: "Failed",
          malipoCustomerRef: customer_ref || null,
          malipoTransactionId: transaction_id || null,
          malipoFailureReason: "Payment declined or not completed on phone",
          malipoRawResponse: req.body,
        },
      });
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("[malipo] Webhook error:", err);
    return res.sendStatus(200); // ACK so Malipo doesn't retry-storm
  }
};

//  STATUS POLL
// GET /api/payments/malipo/:id/status
const getStatus = async (req, res) => {
  try {
    const payment = await prisma.feePayment.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        status: true,
        malipoStatus: true,
        malipoFailureReason: true,
        amount: true,
        receiptNumber: true,
      },
    });

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    return res.json({
      success: true,
      data: {
        id: payment.id,
        status: payment.status,
        malipoStatus: payment.malipoStatus,
        failureReason: payment.malipoFailureReason,
        amount: payment.amount,
        receiptNumber: payment.receiptNumber,
      },
    });
  } catch (err) {
    console.error("Malipo status error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get status" });
  }
};

//  RECONCILIATION
// Catches payments stuck in PENDING for >5 min and checks Malipo directly.
const reconcileStalePending = async () => {
  try {
    const stale = await prisma.feePayment.findMany({
      where: {
        status: "PENDING",
        paymentChannel: "MALIPO",
        createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
      },
      include: {
        student: {
          select: {
            fullName: true,
            parentPhone: true,
            parentEmail: true,
            parentName: true,
          },
        },
      },
    });

    for (const payment of stale) {
      try {
        const enquiry = await malipo.enquireTransaction({
          orderId: payment.id,
        });
        const providerStatus = enquiry?.data?.status;

        if (providerStatus === "Completed") {
          await prisma.feePayment.update({
            where: { id: payment.id },
            data: {
              status: "VERIFIED",
              verifiedAt: new Date(),
              malipoStatus: "Completed",
              malipoRawResponse: enquiry,
            },
          });

          const refreshed = await prisma.feePayment.findUnique({
            where: { id: payment.id },
          });
          await reconcileVerifiedPayment(refreshed);
        } else {
          await prisma.feePayment.update({
            where: { id: payment.id },
            data: {
              status: "REJECTED",
              malipoStatus: "Failed",
              malipoFailureReason:
                providerStatus === "Failed"
                  ? "Payment declined on phone"
                  : "Payment timed out — not completed within 5 minutes",
            },
          });
        }
      } catch (err) {
        console.error(
          `[malipo-reconcile] Could not enquire ${payment.id}:`,
          err.message,
        );
        // Leave PENDING — try again next sweep
      }
    }

    if (stale.length > 0) {
      console.log(
        `[malipo-reconcile] Processed ${stale.length} stale pending payment(s)`,
      );
    }
  } catch (err) {
    console.error("[malipo-reconcile] Sweep error:", err.message);
  }
};

module.exports = {
  initiatePayment,
  webhook,
  getStatus,
  reconcileStalePending,
};
