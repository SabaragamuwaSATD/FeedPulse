import { Request, Response } from "express";
import { validationResult } from "express-validator";
import Feedback from "../models/feedback.model";
import { geminiService } from "../services/gemini.service";
import { sendSuccess, sendError } from "../utils/apiResponse";

/**
 * POST /api/feedback — Submit new feedback (public)
 */
export async function createFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        errors.array().map((e) => e.msg).join(", "),
        "Validation failed",
        400
      );
      return;
    }

    const { title, description, category, submitterName, submitterEmail } =
      req.body;

    // Create and save feedback
    const feedback = new Feedback({
      title,
      description,
      category,
      submitterName: submitterName || "",
      submitterEmail: submitterEmail || "",
    });

    await feedback.save();

    // Trigger AI analysis asynchronously — feedback is saved even if AI fails (Req 2.3)
    (async () => {
      try {
        const analysis = await geminiService.analyzeFeedback(title, description);
        if (analysis) {
          await Feedback.findByIdAndUpdate(feedback._id, {
            ai_category: analysis.category,
            ai_sentiment: analysis.sentiment,
            ai_priority: analysis.priority_score,
            ai_summary: analysis.summary,
            ai_tags: analysis.tags,
            ai_processed: true,
          });
        }
      } catch (aiError) {
        console.error("AI analysis background task failed:", aiError);
      }
    })();

    sendSuccess(res, feedback, "Feedback submitted successfully", 201);
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((e: any) => e.message)
        .join(", ");
      sendError(res, messages, "Validation failed", 400);
      return;
    }
    console.error("Create feedback error:", error);
    sendError(res, "Internal server error", "Failed to submit feedback", 500);
  }
}

/**
 * GET /api/feedback — Get all feedback (admin, supports filters + pagination)
 */
export async function getAllFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      page = "1",
      limit = "10",
      category,
      status,
      sort = "-createdAt",
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit as string, 10) || 10));

    // Build filter
    const filter: any = {};
    if (category && ["Bug", "Feature Request", "Improvement", "Other"].includes(category as string)) {
      filter.category = category;
    }
    if (status && ["New", "In Review", "Resolved"].includes(status as string)) {
      filter.status = status;
    }
    if (search && (search as string).trim()) {
      filter.$text = { $search: search as string };
    }

    // Build sort
    let sortObj: any = { createdAt: -1 };
    const sortStr = sort as string;
    if (sortStr === "priority") sortObj = { ai_priority: -1 };
    else if (sortStr === "-priority") sortObj = { ai_priority: 1 };
    else if (sortStr === "sentiment") sortObj = { ai_sentiment: 1 };
    else if (sortStr === "-sentiment") sortObj = { ai_sentiment: -1 };
    else if (sortStr === "createdAt") sortObj = { createdAt: 1 };
    else if (sortStr === "-createdAt") sortObj = { createdAt: -1 };

    const total = await Feedback.countDocuments(filter);
    const feedback = await Feedback.find(filter)
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    sendSuccess(res, {
      feedback,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get all feedback error:", error);
    sendError(res, "Internal server error", "Failed to fetch feedback", 500);
  }
}

/**
 * GET /api/feedback/summary — AI-generated trend summary
 */
export async function getFeedbackSummary(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFeedback = await Feedback.find({
      createdAt: { $gte: sevenDaysAgo },
    })
      .select("title description ai_sentiment ai_tags")
      .lean();

    const summary = await geminiService.generateWeeklySummary(recentFeedback);

    if (!summary) {
      sendError(
        res,
        "AI summary generation failed",
        "Could not generate summary",
        503
      );
      return;
    }

    sendSuccess(res, {
      summary,
      feedbackCount: recentFeedback.length,
      period: {
        from: sevenDaysAgo.toISOString(),
        to: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get summary error:", error);
    sendError(res, "Internal server error", "Failed to generate summary", 500);
  }
}

/**
 * GET /api/feedback/stats — Dashboard statistics
 */
export async function getFeedbackStats(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const [total, openItems, avgPriorityResult, tagCounts] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: { $ne: "Resolved" } }),
      Feedback.aggregate([
        { $match: { ai_priority: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: "$ai_priority" } } },
      ]),
      Feedback.aggregate([
        { $unwind: "$ai_tags" },
        { $group: { _id: "$ai_tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const avgPriority =
      avgPriorityResult.length > 0
        ? Math.round(avgPriorityResult[0].avg * 10) / 10
        : 0;
    const mostCommonTag = tagCounts.length > 0 ? tagCounts[0]._id : "N/A";

    sendSuccess(res, {
      totalFeedback: total,
      openItems,
      avgPriority,
      mostCommonTag,
      topTags: tagCounts.map((t: any) => ({ tag: t._id, count: t.count })),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    sendError(res, "Internal server error", "Failed to fetch stats", 500);
  }
}

/**
 * GET /api/feedback/:id — Get single feedback item
 */
export async function getFeedbackById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedback = await Feedback.findById(req.params.id).lean();
    if (!feedback) {
      sendError(res, "Not found", "Feedback item not found", 404);
      return;
    }
    sendSuccess(res, feedback);
  } catch (error) {
    console.error("Get feedback by ID error:", error);
    sendError(res, "Internal server error", "Failed to fetch feedback", 500);
  }
}

/**
 * PATCH /api/feedback/:id — Update status (admin only)
 */
export async function updateFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { status } = req.body;
    const validStatuses = ["New", "In Review", "Resolved"];

    if (!status || !validStatuses.includes(status)) {
      sendError(
        res,
        "Invalid status",
        "Status must be: New, In Review, or Resolved",
        400
      );
      return;
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!feedback) {
      sendError(res, "Not found", "Feedback item not found", 404);
      return;
    }

    sendSuccess(res, feedback, "Feedback status updated");
  } catch (error) {
    console.error("Update feedback error:", error);
    sendError(res, "Internal server error", "Failed to update feedback", 500);
  }
}

/**
 * DELETE /api/feedback/:id — Delete feedback (admin only)
 */
export async function deleteFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      sendError(res, "Not found", "Feedback item not found", 404);
      return;
    }
    sendSuccess(res, null, "Feedback deleted successfully");
  } catch (error) {
    console.error("Delete feedback error:", error);
    sendError(res, "Internal server error", "Failed to delete feedback", 500);
  }
}

/**
 * POST /api/feedback/:id/reanalyse — Re-trigger AI analysis (admin, Req 2.6)
 */
export async function reanalyseFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      sendError(res, "Not found", "Feedback item not found", 404);
      return;
    }

    const analysis = await geminiService.analyzeFeedback(
      feedback.title,
      feedback.description
    );

    if (!analysis) {
      sendError(
        res,
        "AI analysis failed",
        "Could not re-analyse feedback",
        503
      );
      return;
    }

    feedback.ai_category = analysis.category;
    feedback.ai_sentiment = analysis.sentiment;
    feedback.ai_priority = analysis.priority_score;
    feedback.ai_summary = analysis.summary;
    feedback.ai_tags = analysis.tags;
    feedback.ai_processed = true;
    await feedback.save();

    sendSuccess(res, feedback, "AI analysis complete");
  } catch (error) {
    console.error("Reanalyse error:", error);
    sendError(res, "Internal server error", "Failed to re-analyse", 500);
  }
}
