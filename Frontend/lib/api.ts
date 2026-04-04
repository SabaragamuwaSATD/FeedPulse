import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("feedpulse_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Feedback API ─────────────────────────────────────────
export interface FeedbackPayload {
  title: string;
  description: string;
  category: string;
  submitterName?: string;
  submitterEmail?: string;
}

export interface Feedback {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: "New" | "In Review" | "Resolved";
  submitterName: string;
  submitterEmail: string;
  ai_category: string;
  ai_sentiment: "Positive" | "Neutral" | "Negative" | "";
  ai_priority: number | null;
  ai_summary: string;
  ai_tags: string[];
  ai_processed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const feedbackApi = {
  submit: (data: FeedbackPayload) => api.post("/feedback", data),

  getAll: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    sort?: string;
    search?: string;
  }) => api.get("/feedback", { params }),

  getById: (id: string) => api.get(`/feedback/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch(`/feedback/${id}`, { status }),

  delete: (id: string) => api.delete(`/feedback/${id}`),

  reanalyse: (id: string) => api.post(`/feedback/${id}/reanalyse`),

  getSummary: () => api.get("/feedback/summary"),

  getStats: () => api.get("/feedback/stats"),
};

// ─── Auth API ─────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
};

export default api;
