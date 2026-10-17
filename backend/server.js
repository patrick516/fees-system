const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
const {
  reconcileStalePending,
} = require("./src/controllers/onekhusa.controller");
const { sweepSubscriptions } = require("./src/lib/subscriptionCron");
const {
  requireActiveSubscription,
} = require("./src/middleware/subscriptionGuard");

dotenv.config();

const app = express();

// Trust Render's proxy so req.ip reflects the real client IP
app.set("trust proxy", 1);

//  MIDDLEWARE
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowed = [
        process.env.FRONTEND_URL,
        process.env.WEBSITE_URL,
        "http://localhost:5173",
        "http://localhost:3000",
      ]
        .filter(Boolean)
        .map((u) => u.replace(/\/$/, ""));

      const cleanOrigin = origin.replace(/\/$/, "");

      if (
        allowed.includes(cleanOrigin) ||
        /^https:\/\/fees-system-[a-z0-9]+-.*\.vercel\.app$/.test(cleanOrigin) ||
        cleanOrigin === "https://fees-system-8z3u.vercel.app"
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${cleanOrigin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const isProd = process.env.NODE_ENV === "production";

// Strict OTP limiter
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 3 : 500,
  message: {
    success: false,
    message: "Too many OTP requests, please wait a minute",
  },
  skip: (req) => req.method === "OPTIONS",
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limiter (general — for password changes etc.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 2000,
  message: {
    success: false,
    message: "Too many auth attempts, please try again later",
  },
  skip: (req) => req.method === "OPTIONS",
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd
    ? parseInt(process.env.LOGIN_RATE_LIMIT_PER_MIN || "10", 10)
    : 1000,
  message: {
    success: false,
    message: "Too many login attempts. Please wait a minute.",
  },
  skip: (req) => req.method === "OPTIONS",
  standardHeaders: true,
  legacyHeaders: false,
});

// Generous limiter for everything else
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 1500 : 20000,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  skip: (req) => req.method === "OPTIONS",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/staff/login", loginLimiter);
app.use("/api/auth/parent/request-otp", otpLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/verify-email", otpLimiter);
app.use("/api/auth/resend-otp", otpLimiter);
app.use("/api/auth/accept-invitation", authLimiter);
app.use("/api/auth", authLimiter);

// Platform owner login — same strict limiter
app.use("/api/platform/auth/login", loginLimiter);
app.use("/api/platform/setup", authLimiter);
app.use("/api/platform", readLimiter);

app.use("/api/", readLimiter);

cron.schedule("*/5 * * * *", () => {
  reconcileStalePending().catch((err) =>
    console.error("[malipo-cron] Sweep failed:", err.message),
  );
});

// Subscription sweep — run on startup, then daily at 1 AM
sweepSubscriptions().catch((err) =>
  console.error("[sub-cron] Startup sweep failed:", err.message),
);
cron.schedule("0 1 * * *", () => {
  sweepSubscriptions().catch((err) =>
    console.error("[sub-cron] Sweep failed:", err.message),
  );
});

if (isProd) {
  console.log("✓ Malipo reconciliation cron scheduled (every 5 min)");
}
// Health monitors ping "/" — return 200 so logs don't fill with 404s
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SchoolPay API",
    status: "running",
    docs: "/api/health for detailed status",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "SchoolPay API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

const authRoutes = require("./src/routes/auth.routes");
const studentRoutes = require("./src/routes/student.routes");
const paymentRoutes = require("./src/routes/payment.routes");
const schoolRoutes = require("./src/routes/school.routes");
const smsRoutes = require("./src/routes/sms.routes");
const reportRoutes = require("./src/routes/report.routes");
const examRoutes = require("./src/routes/exam.routes");
const staffRoutes = require("./src/routes/staff.routes");
const departmentRoutes = require("./src/routes/department.routes");
const roleRoutes = require("./src/routes/role.routes");
const auditRoutes = require("./src/routes/audit.routes");
const platformAuthRoutes = require("./src/routes/platformAuth.routes");
const platformSchoolRoutes = require("./src/routes/platformSchool.routes");
const platformSubscriptionRoutes = require("./src/routes/platformSubscription.routes");
const platformSettingsRoutes = require("./src/routes/platformSettings.routes");
const notificationRoutes = require("./src/routes/notification.routes");
const platformOnekhusaRoutes = require("./src/routes/platformOnekhusa.routes");

// ==================== MOUNT ROUTES ====================

// Auth and platform routes are NOT affected by subscription locks
app.use("/api/auth", authRoutes);
app.use("/api/platform/schools", platformSchoolRoutes);
app.use("/api/platform/subscriptions", platformSubscriptionRoutes);
app.use("/api/platform/settings", platformSettingsRoutes);
app.use("/api/platform/notifications", notificationRoutes);
app.use("/api/platform/onekhusa", platformOnekhusaRoutes);
app.use("/api/platform", platformAuthRoutes);

// Apply subscription guard to all school data routes
app.use("/api/students", requireActiveSubscription, studentRoutes);
app.use("/api/payments", requireActiveSubscription, paymentRoutes);
app.use("/api/sms", requireActiveSubscription, smsRoutes);
app.use("/api/reports", requireActiveSubscription, reportRoutes);
app.use("/api/exams", requireActiveSubscription, examRoutes);
app.use("/api/staff", requireActiveSubscription, staffRoutes);
app.use("/api/departments", requireActiveSubscription, departmentRoutes);
app.use("/api/roles", requireActiveSubscription, roleRoutes);
app.use("/api/audit", requireActiveSubscription, auditRoutes);

// Schools routes need special handling: block everything EXCEPT the subscription pay route
app.use(
  "/api/schools",
  (req, res, next) => {
    // Allow the subscription payment endpoint even if locked
    if (req.path === "/subscription/pay") return next();
    requireActiveSubscription(req, res, next);
  },
  schoolRoutes,
);

//  404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

//  ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ============ START ============
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
  ================================
  SchoolPay API Server Running
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV}
  ================================
  `);
});

server.on("close", () => {
  console.log("SERVER CLOSED");
});

process.on("exit", (code) => {
  console.log("PROCESS EXITED WITH CODE:", code);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

module.exports = app;
