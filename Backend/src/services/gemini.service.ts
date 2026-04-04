import { GoogleGenerativeAI } from "@google/generative-ai";

interface AIAnalysisResult {
  category: "Bug" | "Feature Request" | "Improvement" | "Other";
  sentiment: "Positive" | "Neutral" | "Negative";
  priority_score: number;
  summary: string;
  tags: string[];
}

interface AIWeeklySummary {
  themes: { theme: string; count: number; description: string }[];
  overall_sentiment: string;
  recommendations: string[];
}

class GeminiService {
  private model: any;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY not set — AI features will be disabled");
      return;
    }

    const configuredModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    this.modelName = configuredModel.replace(/^models\//, "");

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: this.modelName });
      console.log(`✅ Gemini initialized with model: ${this.modelName}`);
    } catch (error) {
      console.error("❌ Failed to initialize Gemini model:", error);
      this.model = null;
    }
  }

  /**
   * Analyze a single feedback submission
   */
  async analyzeFeedback(
    title: string,
    description: string
  ): Promise<AIAnalysisResult | null> {
    if (!this.model) {
      console.warn("Gemini model not initialized — skipping AI analysis");
      return null;
    }

    const prompt = `Analyse this product feedback. Return ONLY valid JSON with these exact fields — no markdown, no code fences, no extra text.

Title: "${title}"
Description: "${description}"

Required JSON format:
{
  "category": "Bug" | "Feature Request" | "Improvement" | "Other",
  "sentiment": "Positive" | "Neutral" | "Negative",
  "priority_score": <number from 1 (low) to 10 (critical)>,
  "summary": "<one concise sentence summarising the feedback>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}

Rules:
- category must be exactly one of: Bug, Feature Request, Improvement, Other
- sentiment must be exactly one of: Positive, Neutral, Negative
- priority_score must be an integer from 1 to 10
- tags should be 2-5 relevant single-word or short-phrase labels
- Return ONLY the JSON object, nothing else`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      let text = response.text().trim();

      // Strip markdown code fences if present
      text = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

      const parsed: AIAnalysisResult = JSON.parse(text);

      // Validate and clamp values
      const validCategories = [
        "Bug",
        "Feature Request",
        "Improvement",
        "Other",
      ];
      const validSentiments = ["Positive", "Neutral", "Negative"];

      if (!validCategories.includes(parsed.category)) {
        parsed.category = "Other";
      }
      if (!validSentiments.includes(parsed.sentiment)) {
        parsed.sentiment = "Neutral";
      }
      parsed.priority_score = Math.max(
        1,
        Math.min(10, Math.round(parsed.priority_score))
      );
      if (!Array.isArray(parsed.tags)) {
        parsed.tags = [];
      }

      return parsed;
    } catch (error) {
      console.error(`Gemini analysis failed (${this.modelName}):`, error);
      return null;
    }
  }

  /**
   * Generate a weekly/on-demand summary of recent feedback themes
   */
  async generateWeeklySummary(
    feedbackItems: {
      title: string;
      description: string;
      ai_sentiment?: string;
      ai_tags?: string[];
    }[]
  ): Promise<AIWeeklySummary | null> {
    if (!this.model) {
      console.warn("Gemini model not initialized — skipping summary");
      return null;
    }

    if (feedbackItems.length === 0) {
      return {
        themes: [],
        overall_sentiment: "No data",
        recommendations: ["No feedback received in this period."],
      };
    }

    const feedbackList = feedbackItems
      .map(
        (f, i) =>
          `${i + 1}. Title: "${f.title}" | Description: "${f.description}" | Sentiment: ${f.ai_sentiment || "Unknown"} | Tags: ${(f.ai_tags || []).join(", ")}`
      )
      .join("\n");

    const prompt = `Analyse these ${feedbackItems.length} product feedback submissions from the last 7 days and identify the top 3 themes. Return ONLY valid JSON — no markdown, no code fences.

Feedback:
${feedbackList}

Required JSON format:
{
  "themes": [
    { "theme": "<theme name>", "count": <number of items related>, "description": "<brief explanation>" },
    { "theme": "<theme name>", "count": <number>, "description": "<brief>" },
    { "theme": "<theme name>", "count": <number>, "description": "<brief>" }
  ],
  "overall_sentiment": "Mostly Positive" | "Mostly Neutral" | "Mostly Negative" | "Mixed",
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>"]
}

Return ONLY the JSON object.`;

    try {
      const result = await this.model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      const parsed: AIWeeklySummary = JSON.parse(text);
      return parsed;
    } catch (error) {
      console.error(`Gemini weekly summary failed (${this.modelName}):`, error);
      return null;
    }
  }
}

export const geminiService = new GeminiService();
