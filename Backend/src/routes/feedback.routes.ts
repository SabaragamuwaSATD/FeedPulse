import { Router } from "express";
import { body } from "express-validator";
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  getFeedbackSummary,
  getFeedbackStats,
  updateFeedback,
  deleteFeedback,
  reanalyseFeedback,
} from "../controllers/feedback.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Validation rules for feedback submission
const feedbackValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 120 })
    .withMessage("Title cannot exceed 120 characters"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters"),
  body("category")
    .isIn(["Bug", "Feature Request", "Improvement", "Other"])
    .withMessage("Category must be Bug, Feature Request, Improvement, or Other"),
  body("submitterEmail")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Please provide a valid email"),
];

// Public routes
router.post("/", feedbackValidation, createFeedback);

// Admin routes — summary & stats must come BEFORE :id to avoid route conflicts
router.get("/summary", authMiddleware, getFeedbackSummary);
router.get("/stats", authMiddleware, getFeedbackStats);
router.get("/", authMiddleware, getAllFeedback);
router.get("/:id", authMiddleware, getFeedbackById);
router.patch("/:id", authMiddleware, updateFeedback);
router.delete("/:id", authMiddleware, deleteFeedback);
router.post("/:id/reanalyse", authMiddleware, reanalyseFeedback);

export default router;
