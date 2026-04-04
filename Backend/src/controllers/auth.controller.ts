import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { sendSuccess, sendError } from "../utils/apiResponse";

/**
 * POST /api/auth/login — Admin login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, "Missing credentials", "Email and password are required", 400);
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      sendError(res, "Invalid credentials", "Invalid email or password", 401);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, "Invalid credentials", "Invalid email or password", 401);
      return;
    }

    const secret = process.env.JWT_SECRET || "fallback-secret";
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      secret,
      { expiresIn: "24h" }
    );

    sendSuccess(res, {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }, "Login successful");
  } catch (error) {
    console.error("Login error:", error);
    sendError(res, "Internal server error", "Login failed", 500);
  }
}

/**
 * Seed the default admin user if none exists
 */
export async function seedAdmin(): Promise<void> {
  try {
    const existingAdmin = await User.findOne({ role: "admin" });
    if (!existingAdmin) {
      await User.create({
        email: "admin@feedpulse.com",
        password: "admin123",
        name: "Admin",
        role: "admin",
      });
      console.log("✅ Default admin user created: admin@feedpulse.com / admin123");
    }
  } catch (error) {
    console.error("Admin seed error:", error);
  }
}
