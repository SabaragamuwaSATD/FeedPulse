import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  title: string;
  description: string;
  category: "Bug" | "Feature Request" | "Improvement" | "Other";
  status: "New" | "In Review" | "Resolved";
  submitterName?: string;
  submitterEmail?: string;
  ai_category?: string;
  ai_sentiment?: "Positive" | "Neutral" | "Negative";
  ai_priority?: number;
  ai_summary?: string;
  ai_tags?: string[];
  ai_processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Bug", "Feature Request", "Improvement", "Other"],
        message: "Category must be Bug, Feature Request, Improvement, or Other",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["New", "In Review", "Resolved"],
        message: "Status must be New, In Review, or Resolved",
      },
      default: "New",
    },
    submitterName: {
      type: String,
      trim: true,
      default: "",
    },
    submitterEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      validate: {
        validator: function (v: string) {
          if (!v || v === "") return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please provide a valid email address",
      },
    },
    // AI-populated fields
    ai_category: { type: String, default: "" },
    ai_sentiment: {
      type: String,
      enum: ["Positive", "Neutral", "Negative", ""],
      default: "",
    },
    ai_priority: {
      type: Number,
      min: 1,
      max: 10,
      default: undefined,
    },
    ai_summary: { type: String, default: "" },
    ai_tags: { type: [String], default: [] },
    ai_processed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance (Requirement 5.2)
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ ai_priority: -1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ title: "text", ai_summary: "text" });

const Feedback = mongoose.model<IFeedback>("Feedback", feedbackSchema);
export default Feedback;
