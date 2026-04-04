import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";

import feedbackRoutes from "./routes/feedback.routes";
import authRoutes from "./routes/auth.routes";
import { sanitizeInput } from "./middleware/sanitize.middleware";
import { seedAdmin } from "./controllers/auth.controller";

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(sanitizeInput);

// Rate limiting for feedback submission (Req 1.7) — 5 per hour per IP
const feedbackSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    error: "Too many submissions",
    message: "You can only submit 5 feedback items per hour. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Routes ─────────────────────────────────────────────
app.post("/api/feedback", feedbackSubmitLimiter);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "FeedPulse API is running", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found", message: "Route not found" });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error", message: "Something went wrong" });
});

// ─── Database & Start ───────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/feedpulse";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`🚀 FeedPulse API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

export default app;
