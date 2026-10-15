// backend/src/controllers/onekhusa.controller.js
const crypto = require("crypto");
const prisma = require("../config/db");
const onekhusa = require("../lib/onekhusa");
const { reconcileVerifiedPayment } = require("../lib/paymentReconciliation");
const { sendNotifications } = require("../lib/notifier");
const { generateReceiptNumber } = require("../lib/utils");

const MIN_AMOUNT = 100; // MWK
const STALE_AFTER_MS = 16 * 60 * 1000; // TAN expires in 15 min

// ==================== INITIATE PAYMENT ====================
// POST /api/payments/onekhusa/initiate
const initiatePayment = async (req, res) => {
  try {
    const { studentId, amount, term, academicYear } = req.body;

    if (!studentId || !amount || !term) {
      return res.status(400).json({
        success: false,
        message: "studentId, amount and term are required",
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

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: req.schoolId || req.student?.schoolId,
      },
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

    // Get fee structure for context
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: student.schoolId,
        classId: student.classId,
        term,
        academicYear: year,
        isActive: true,
      },
    });

    // Generate receipt + create PENDING payment
    const paymentCount = await prisma.feePayment.count({
      where: { schoolId: student.schoolId },
    });
    const receiptNumber = generateReceiptNumber(year, paymentCount + 1);

    const payment = await prisma.feePayment.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        amount: parseFloat(amount),
        paymentMethod: "AIRTEL_MONEY", // placeholder, will be updated by webhook
        term,
        academicYear: year,
        receiptNumber,
        submittedBy: "PARENT",
        status: "PENDING",
        requiredAmount: feeStructure?.totalAmount || null,
        paymentChannel: "ONEKHUSA",
        malipoStatus: "Processing",
      },
    });

    // Reference must be 5-25 alphanumeric
    // Our UUIDs are 36 chars with dashes — need to shorten
    const reference =
      `${receiptNumber.replace(/[^A-Z0-9]/g, "")}${Date.now().toString(36).toUpperCase()}`.slice(
        0,
        25,
      );

    // Fire the Request-to-Pay
    try {
      const result = await onekhusa.requestToPay({
        referenceNumber: reference,
        amount: Number(amount),
        description: `School fees - ${student.fullName}`,
        capturedBy: student.school.email || "admin@schoolpay.mw",
      });

      // Save the TAN + reference on the payment record
      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          malipoTransactionId: reference, // our merchant reference
          malipoCustomerRef: result.timedAccountNumber, // the TAN
          malipoStatus: "AwaitingPayment",
          malipoRawResponse: result,
        },
      });

      return res.status(202).json({
        success: true,
        awaitingConfirmation: true,
        message: "Payment request created. Send the money to complete.",
        data: {
          paymentId: payment.id,
          receiptNumber,
          timedAccountNumber: result.timedAccountNumber,
          transactionAmount: Number(amount),
          expiryDate: result.expiryDate,
          expiryInMinutes: result.expiryInMinutes,
        },
      });
    } catch (paymentErr) {
      console.error("========== ONEKHUSA INITIATE FAILED ==========");
      console.error("Message:", paymentErr.message);
      console.error("Status:", paymentErr.response?.status);
      console.error(
        "Response body:",
        JSON.stringify(paymentErr.response?.data, null, 2),
      );
      console.error("==============================================");

      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: "REJECTED",
          malipoStatus: "Failed",
          malipoFailureReason: `Could not start payment: ${paymentErr.message}`,
          malipoRawResponse: paymentErr.response?.data || {
            error: paymentErr.message,
          },
        },
      });

      return res.status(502).json({
        success: false,
        message:
          paymentErr.response?.data?.message ||
          "Payment provider error — please try again",
      });
    }
  } catch (err) {
    console.error("Initiate payment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to initiate payment" });
  }
};

// ==================== WEBHOOK ====================
// POST /api/payments/onekhusa/webhook
const webhook = async (req, res) => {
  // Respond IMMEDIATELY, then process in background (per OneKhusa docs)
  res.status(200).send("acknowledged");

  try {
    const signature = req.headers["x-onekhusa-webhook-signature"];
    const eventType = req.headers["x-onekhusa-webhook-event"];

    // ============================================================
    // DIAGNOSTIC — log everything on every webhook so we can inspect
    // the real signature scheme. Remove the console logs once verified.
    // ============================================================
    console.log("========== ONEKHUSA WEBHOOK RECEIVED ==========");
    console.log("Event:", eventType);
    console.log("Signature:", signature);
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("================================================");

    // ============================================================
    // SIGNATURE VERIFICATION
    // Disabled by default while we learn the exact signing scheme.
    // Enable by setting ONEKHUSA_WEBHOOK_VERIFY=true in .env
    // ============================================================
    const shouldVerify = process.env.ONEKHUSA_WEBHOOK_VERIFY === "true";

    if (shouldVerify) {
      // Pick the secret based on the event
      let secret = null;
      if (eventType === "payrequest.success") {
        secret = process.env.ONEKHUSA_WEBHOOK_SECRET_SUCCESS;
      } else if (eventType === "payrequest.reversed") {
        secret = process.env.ONEKHUSA_WEBHOOK_SECRET_REVERSED;
      }

      if (!secret) {
        console.warn(`[onekhusa] No secret configured for event: ${eventType}`);
        return;
      }

      // Compute HMAC-SHA512 of the raw payload. Try multiple input formats
      // because different gateways do it differently.
      const rawBody = JSON.stringify(req.body);
      const candidates = {
        "json-string-hex": crypto
          .createHmac("sha512", secret)
          .update(rawBody)
          .digest("hex"),
        "json-string-base64": crypto
          .createHmac("sha512", secret)
          .update(rawBody)
          .digest("base64"),
        "utf8-hex": crypto
          .createHmac("sha512", secret)
          .update(Buffer.from(rawBody, "utf8"))
          .digest("hex"),
      };

      const matched = Object.entries(candidates).find(
        ([, val]) => val === signature,
      );

      if (!matched) {
        console.warn(
          `[onekhusa] Signature mismatch for ${eventType}. ` +
            `Header=${signature} ` +
            `Candidates=${JSON.stringify(candidates)}`,
        );
        return;
      }

      console.log(`[onekhusa] Signature verified (${matched[0]})`);
    }

    // ============================================================
    // Process the event
    // ============================================================
    const {
      transactionReferenceNumber,
      transactionAmount,
      transactionStatusCode, // "S" = success, "R" = reversed
      metaData,
    } = req.body;

    // Get our merchant reference from metaData
    const merchantRef = metaData?.referenceNumber;
    if (!merchantRef) {
      console.warn("[onekhusa] Webhook missing referenceNumber");
      return;
    }

    const payment = await prisma.feePayment.findFirst({
      where: { malipoTransactionId: merchantRef },
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
      console.warn("[onekhusa] No payment found for ref:", merchantRef);
      return;
    }

    // Idempotency — skip if already resolved
    if (payment.status !== "PENDING") {
      console.log("[onekhusa] Payment already resolved, skipping");
      return;
    }

    if (eventType === "payrequest.success" && transactionStatusCode === "S") {
      // Success!
      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          malipoStatus: "Completed",
          malipoTransactionId: transactionReferenceNumber,
          malipoRawResponse: req.body,
        },
      });

      const refreshed = await prisma.feePayment.findUnique({
        where: { id: payment.id },
      });
      const reconcile = await reconcileVerifiedPayment(refreshed);

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
      }).catch((e) => console.error("OneKhusa notif error:", e));

      console.log(`[onekhusa] Payment ${payment.id} verified ✓`);
    } else if (eventType === "payrequest.reversed") {
      // Reversal — mark the payment rejected
      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: "REJECTED",
          malipoStatus: "Reversed",
          malipoFailureReason: "Payment was reversed by provider",
          malipoRawResponse: req.body,
        },
      });
      console.log(`[onekhusa] Payment ${payment.id} reversed`);
    }
  } catch (err) {
    console.error("[onekhusa] Webhook processing error:", err);
  }
};

//  STATUS POLL
// GET /api/payments/onekhusa/:id/status
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
    console.error("Get status error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get status" });
  }
};

// ==================== RECONCILIATION ====================
// Cleans up TANs that expired without payment
const reconcileStalePending = async () => {
  try {
    const stale = await prisma.feePayment.findMany({
      where: {
        status: "PENDING",
        paymentChannel: "ONEKHUSA",
        createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
      },
    });

    for (const payment of stale) {
      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: "REJECTED",
          malipoStatus: "Expired",
          malipoFailureReason:
            "Payment request expired — no money was sent within 15 minutes",
        },
      });
    }

    if (stale.length > 0) {
      console.log(
        `[onekhusa-reconcile] Expired ${stale.length} stale payment(s)`,
      );
    }
  } catch (err) {
    console.error("[onekhusa-reconcile] Sweep error:", err.message);
  }
};

module.exports = {
  initiatePayment,
  webhook,
  getStatus,
  reconcileStalePending,
};
