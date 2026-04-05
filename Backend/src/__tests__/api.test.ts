import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express, { type Application } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeAll, afterAll, afterEach, describe, it, expect } from "@jest/globals";

// Set env vars BEFORE any app module imports
process.env.JWT_SECRET = "test-secret";
process.env.GEMINI_API_KEY = "";
process.env.GEMINI_MODEL = "gemini-1.5-flash";

// Static imports — env is already configured above
import feedbackRoutes from "../routes/feedback.routes";
import authRoutes from "../routes/auth.routes";
import { sanitizeInput } from "../middleware/sanitize.middleware";
import Feedback from "../models/feedback.model";
import User from "../models/user.model";
import { geminiService } from "../services/gemini.service";

let mongoServer: MongoMemoryServer;
let app: Application;
let adminToken: string;

function createApp(): Application {
  const testApp = express();
  testApp.use(express.json());
  testApp.use(sanitizeInput);
  testApp.use("/api/feedback", feedbackRoutes);
  testApp.use("/api/auth", authRoutes);
  return testApp;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = createApp();

  await User.create({
    email: "admin@feedpulse.com",
    password: "admin123",
    name: "Admin",
    role: "admin",
  });

  adminToken = jwt.sign(
    { userId: "testid", role: "admin" },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Feedback.deleteMany({});
});

// ─── Feedback Submission ────────────────────
describe("POST /api/feedback", () => {
  it("should create feedback with valid data", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({
        title: "Test feedback title",
        description:
          "This is a detailed description that is at least twenty characters long for validation.",
        category: "Bug",
        submitterName: "Test User",
        submitterEmail: "test@example.com",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe("Test feedback title");
    expect(res.body.data.status).toBe("New");
    expect(res.body.data.category).toBe("Bug");
  });

  it("should reject feedback with empty title", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({
        title: "",
        description:
          "This is a detailed description that is at least twenty characters long for validation.",
        category: "Bug",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject feedback with description under 20 characters", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({
        title: "Valid title here",
        description: "Too short",
        category: "Bug",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject feedback with invalid category", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({
        title: "Valid title here",
        description:
          "This is a detailed description that is at least twenty characters long for validation.",
        category: "InvalidCategory",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Status Update ──────────────────────────
describe("PATCH /api/feedback/:id", () => {
  it("should update feedback status with valid auth", async () => {
    const feedback = await Feedback.create({
      title: "Test item for status update",
      description:
        "This is a detailed description for testing the status update functionality properly.",
      category: "Feature Request",
    });

    const res = await request(app)
      .patch(`/api/feedback/${feedback._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "In Review" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("In Review");
  });
});

// ─── Auth Middleware ─────────────────────────
describe("Auth Middleware", () => {
  it("should reject requests without token", async () => {
    const res = await request(app).get("/api/feedback");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject requests with invalid token", async () => {
    const res = await request(app)
      .get("/api/feedback")
      .set("Authorization", "Bearer totally-invalid-token");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should accept requests with valid token", async () => {
    const res = await request(app)
      .get("/api/feedback")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Admin Login ─────────────────────────────
describe("POST /api/auth/login", () => {
  it("should return token for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@feedpulse.com", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe("admin@feedpulse.com");
  });

  it("should reject invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@feedpulse.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── Gemini Service ──────────────────────────
describe("Gemini Service", () => {
  it("should return null when API key is not set", async () => {
    const result = await geminiService.analyzeFeedback(
      "Test title",
      "Test description that is long enough for analysis"
    );
    expect(result).toBeNull();
  });
});
