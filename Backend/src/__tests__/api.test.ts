import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// Setup in-memory MongoDB
let mongoServer: MongoMemoryServer;

// We need to build a test app
const buildApp = async () => {
  // Set env vars before importing modules
  process.env.JWT_SECRET = "test-secret";
  process.env.GEMINI_API_KEY = ""; // disable AI in tests

  const app = express();
  app.use(express.json());

  // Dynamic imports after env is set
  const feedbackRoutes = (await import("../routes/feedback.routes")).default;
  const authRoutes = (await import("../routes/auth.routes")).default;
  const { sanitizeInput } = await import("../middleware/sanitize.middleware");

  app.use(sanitizeInput);
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/auth", authRoutes);

  return app;
};

let app: express.Application;
let adminToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = await buildApp();

  // Create admin user
  const User = (await import("../models/user.model")).default;
  await User.create({
    email: "admin@feedpulse.com",
    password: "admin123",
    name: "Admin",
    role: "admin",
  });

  // Generate token
  adminToken = jwt.sign(
    { userId: "testid", role: "admin" },
    "test-secret",
    { expiresIn: "1h" }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const Feedback = (await import("../models/feedback.model")).default;
  await Feedback.deleteMany({});
});

describe("POST /api/feedback", () => {
  // Test 1: Valid submission saves to DB
  it("should create feedback with valid data", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({
        title: "Test feedback title",
        description: "This is a detailed description that is at least twenty characters long.",
        category: "Bug",
        submitterName: "Test User",
        submitterEmail: "test@example.com",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Test feedback title");
    expect(res.body.data.status).toBe("New");
    expect(res.body.data.category).toBe("Bug");
  });

  // Test 2: Rejects empty title
  it("should reject feedback with empty title", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({
        title: "",
        description: "This is a detailed description that is at least twenty characters long.",
        category: "Bug",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Test 3: Rejects short description
  it("should reject feedback with description under 20 characters", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({
        title: "Test title",
        description: "Too short",
        category: "Bug",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Test 4: Rejects invalid category
  it("should reject feedback with invalid category", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({
        title: "Test title",
        description: "This is a detailed description that is at least twenty characters long.",
        category: "InvalidCategory",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("PATCH /api/feedback/:id", () => {
  // Test 5: Status update works correctly
  it("should update feedback status with valid auth", async () => {
    const Feedback = (await import("../models/feedback.model")).default;
    const feedback = await Feedback.create({
      title: "Test item for status update",
      description: "This is a detailed description for testing status update functionality.",
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

describe("Auth Middleware", () => {
  // Test 6: Protected routes reject unauthenticated requests
  it("should reject requests without token", async () => {
    const res = await request(app).get("/api/feedback");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Test 7: Protected routes reject invalid tokens
  it("should reject requests with invalid token", async () => {
    const res = await request(app)
      .get("/api/feedback")
      .set("Authorization", "Bearer invalid-token-here");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Test 8: Protected routes accept valid tokens
  it("should accept requests with valid token", async () => {
    const res = await request(app)
      .get("/api/feedback")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("POST /api/auth/login", () => {
  // Test 9: Login with valid credentials
  it("should return token for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@feedpulse.com", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  // Test 10: Login with invalid credentials
  it("should reject invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@feedpulse.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("Gemini Service", () => {
  // Test 11: Gemini service handles missing API key gracefully
  it("should return null when API key is not set", async () => {
    const { geminiService } = await import("../services/gemini.service");
    const result = await geminiService.analyzeFeedback(
      "Test title",
      "Test description for analysis"
    );
    // Without API key, should return null gracefully
    expect(result).toBeNull();
  });
});
