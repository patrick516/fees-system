const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

// ============ MIDDLEWARE ============
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

// Auth limiter (login attempts, password changes)
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

// Apply the strictest first (Express matches in order)
app.use("/api/auth/parent/request-otp", otpLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/verify-email", otpLimiter);
app.use("/api/auth/resend-otp", otpLimiter);
app.use("/api/auth/accept-invitation", authLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/", readLimiter);

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

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/roles", roleRoutes);

// ============ 404 ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ============ ERROR HANDLER ============
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
