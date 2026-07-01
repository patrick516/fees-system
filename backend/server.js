const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

//middleware
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.WEBSITE_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});
app.use("/api/", limiter);

// Strict OTP rate limit
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many OTP requests, please wait a minute",
  },
});
app.use("/api/auth/parent/request-otp", otpLimiter);

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

// MOUNT ROUTES WITH /api PREFIX (as frontend expects)
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/reports", reportRoutes);

//404 error handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

//starting the server
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
