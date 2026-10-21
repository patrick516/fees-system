// backend/src/controllers/onekhusa.controller.js
const crypto = require("crypto");
const prisma = require("../config/db");
const onekhusa = require("../lib/onekhusa");
const { reconcileVerifiedPayment } = require("../lib/paymentReconciliation");
const { sendNotifications } = require("../lib/notifier");
const { generateReceiptNumber } = require("../lib/utils");
const { computeExtendedEnd } = require("../lib/subscription");

const MIN_AMOUNT = 100; // MWK
const STALE_AFTER_MS = 16 * 60 * 1000; // TAN expires in 15 min

//  INITIATE PAYMENT
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

    const merchantAccount = student.school.onekhusaMerchantAccount;
    if (!merchantAccount || isNaN(Number(merchantAccount))) {
      return res.status(400).json({
        success: false,
        message:
          "This school's online payment account is configured incorrectly. Please contact the platform administrator.",
      });
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

    const paymentCount = await prisma.feePayment.count({
      where: { schoolId: student.schoolId },
    });
    const receiptNumber = generateReceiptNumber(year, paymentCount + 1);

    const payment = await prisma.feePayment.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        amount: parseFloat(amount),
        paymentMethod: "AIRTEL_MONEY",
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
    const reference = `${receiptNumber.replace(/[^A-Z0-9]/g, "")}${Date.now()
      .toString(36)
      .toUpperCase()}`.slice(0, 25);

    try {
      const result = await onekhusa.requestToPay({
        // ⭐ pass THIS SCHOOL's merchant account
        merchantAccountNumber: student.school.onekhusaMerchantAccount,
        referenceNumber: reference,
        amount: Number(amount),
        description: `School fees - ${student.fullName}`,
        capturedBy: student.school.email || "admin@schoolpay.mw",
      });

      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          malipoTransactionId: reference,
          malipoCustomerRef: result.timedAccountNumber,
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
      console.error("School:", student.school.name);
      console.error("Merchant:", student.school.onekhusaMerchantAccount);
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

//  SUBSCRIPTION WEBHOOK HANDLER
const handleSubscriptionWebhook = async (body, platform, eventType) => {
  const { transactionReferenceNumber, transactionStatusCode, metaData } = body;
  const ref = metaData?.ReferenceNumber || metaData?.referenceNumber;
  if (!ref) {
    console.warn("[onekhusa-sub] Missing referenceNumber");
    return;
  }

  const payment = await prisma.subscriptionPayment.findFirst({
    where: {
      onekhusaTransactionRef: ref,
      method: "ONEKHUSA",
    },
  });

  if (!payment) {
    console.warn("[onekhusa-sub] No subscription payment for ref:", ref);
    return;
  }

  if (payment.status !== "PENDING") {
    console.log("[onekhusa-sub] Payment already resolved, skipping");
    return;
  }

  if (eventType === "payrequest.success" && transactionStatusCode === "S") {
    const school = await prisma.school.findUnique({
      where: { id: payment.schoolId },
    });
    if (!school) {
      console.warn("[onekhusa-sub] School not found for payment");
      return;
    }

    const newEnd = computeExtendedEnd(school, 90);

    await prisma.$transaction([
      prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: "VERIFIED",
          paidAt: new Date(),
          onekhusaStatus: "Completed",
          onekhusaRawResponse: body,
        },
      }),
      prisma.school.update({
        where: { id: school.id },
        data: {
          subscriptionStatus: "ACTIVE",
          subscriptionEndsAt: newEnd,
          trialEndsAt: null,
        },
      }),
    ]);

    console.log(
      `[onekhusa-sub] ✓ ${school.name} subscription extended to ${newEnd.toISOString()}`,
    );
  } else if (eventType === "payrequest.reversed") {
    await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: "REJECTED",
        onekhusaStatus: "Reversed",
        onekhusaRawResponse: body,
      },
    });
    console.log(`[onekhusa-sub] Payment ${payment.id} reversed`);
  }
};

//  WEBHOOK
// POST /api/payments/onekhusa/webhook
// ⭐ Routes by beneficiaryAccountNumber to find the right school.
const webhook = async (req, res) => {
  // Respond IMMEDIATELY per OneKhusa's 30s timeout requirement
  res.status(200).send("acknowledged");

  try {
    const signature = req.headers["x-onekhusa-webhook-signature"];
    const eventType = req.headers["x-onekhusa-webhook-event"];

    console.log("========== ONEKHUSA WEBHOOK RECEIVED ==========");
    console.log("Event:", eventType);
    console.log("Signature:", signature);
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("================================================");

    // ============ STEP 1: Identify which school ============
    const merchantAccount = req.body.beneficiaryAccountNumber;
    if (!merchantAccount) {
      console.warn("[onekhusa] Webhook missing beneficiaryAccountNumber");
      return;
    }

    const school = await prisma.school.findFirst({
      where: { onekhusaMerchantAccount: String(merchantAccount) },
      select: {
        id: true,
        name: true,
        onekhusaWebhookSecretSuccess: true,
        onekhusaWebhookSecretReversed: true,
        notificationDefaults: true,
      },
    });

    // If no school matches, check if this is the PLATFORM's subscription
    // merchant account (schools paying SchoolPay for their subscription).
    if (!school) {
      const platform = await prisma.platform.findFirst({
        where: { subscriptionMerchantAccount: String(merchantAccount) },
      });

      if (platform) {
        console.log(
          `[onekhusa] Routed to PLATFORM (subscription): ${merchantAccount}`,
        );

        // Verify signature if enabled
        const shouldVerify = process.env.ONEKHUSA_WEBHOOK_VERIFY === "true";
        if (shouldVerify && platform.subscriptionWebhookSecretSuccess) {
          const secret =
            eventType === "payrequest.success"
              ? platform.subscriptionWebhookSecretSuccess
              : platform.subscriptionWebhookSecretReversed;

          if (!secret) {
            console.warn(
              `[onekhusa-sub] No secret for ${eventType} — skipping verification`,
            );
          } else {
            const rawBody = JSON.stringify(req.body);
            const expected = crypto
              .createHmac("sha512", secret)
              .update(rawBody)
              .digest("hex");
            if (expected !== signature) {
              console.warn("[onekhusa-sub] Signature mismatch");
              return;
            }
          }
        }

        await handleSubscriptionWebhook(req.body, platform, eventType);
        return;
      }

      console.warn(
        `[onekhusa] No school or platform found for merchant account: ${merchantAccount}`,
      );
      return;
    }

    console.log(`[onekhusa] Routed to school: ${school.name}`);

    // ============ STEP 2: Verify signature (if enabled) ============
    const shouldVerify = process.env.ONEKHUSA_WEBHOOK_VERIFY === "true";

    if (shouldVerify) {
      let secret = null;
      if (eventType === "payrequest.success") {
        secret = school.onekhusaWebhookSecretSuccess;
      } else if (eventType === "payrequest.reversed") {
        secret = school.onekhusaWebhookSecretReversed;
      }

      if (!secret) {
        console.warn(
          `[onekhusa] No webhook secret configured for ${school.name} / ${eventType}`,
        );
        return;
      }

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
      };

      const matched = Object.entries(candidates).find(
        ([, val]) => val === signature,
      );

      if (!matched) {
        console.warn(`[onekhusa] Signature mismatch for ${school.name}`);
        return;
      }
      console.log(`[onekhusa] Signature verified (${matched[0]})`);
    }

    // ============ STEP 3: Process ============
    // ============ STEP 3: Process ============
    const { transactionReferenceNumber, transactionStatusCode, metaData } =
      req.body;

    const merchantRef = metaData?.ReferenceNumber || metaData?.referenceNumber;
    if (!merchantRef) {
      console.warn("[onekhusa] Webhook missing referenceNumber");
      return;
    }

    const payment = await prisma.feePayment.findFirst({
      where: {
        malipoTransactionId: merchantRef,
        schoolId: school.id, // ⭐ double-check it belongs to this school
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

    if (!payment) {
      console.warn("[onekhusa] No payment found for ref:", merchantRef);
      return;
    }

    if (payment.status !== "PENDING") {
      console.log("[onekhusa] Payment already resolved, skipping");
      return;
    }

    if (eventType === "payrequest.success" && transactionStatusCode === "S") {
      // 🎯 Extract the fee data sent by OneKhusa
      const amountReceived = req.body.beneficiary?.amountReceived;
      const transactionFee = req.body.transaction?.transactionFee;

      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          malipoStatus: "Completed",
          malipoTransactionId: transactionReferenceNumber,
          malipoRawResponse: req.body,
          platformFee:
            transactionFee !== undefined ? parseFloat(transactionFee) : null,
          netAmount:
            amountReceived !== undefined ? parseFloat(amountReceived) : null,
        },
      });

      const refreshed = await prisma.feePayment.findUnique({
        where: { id: payment.id },
      });
      const reconcile = await reconcileVerifiedPayment(refreshed);

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
        schoolId: school.id,
        schoolName: school.name,
      }).catch((e) => console.error("OneKhusa notif error:", e));

      console.log(
        `[onekhusa] ✓ ${school.name} — Payment ${payment.id} verified`,
      );
    } else if (eventType === "payrequest.reversed") {
      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: "REJECTED",
          malipoStatus: "Reversed",
          malipoFailureReason: "Payment was reversed by provider",
          malipoRawResponse: req.body,
        },
      });
      console.log(`[onekhusa] ${school.name} — Payment ${payment.id} reversed`);
    }
  } catch (err) {
    console.error("[onekhusa] Webhook processing error:", err);
  }
};

// ==================== STATUS POLL ====================
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
