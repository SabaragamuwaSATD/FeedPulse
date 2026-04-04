"use client";

import { useState } from "react";
import { feedbackApi } from "@/lib/api";
import {
  MessageSquarePlus,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["Bug", "Feature Request", "Improvement", "Other"] as const;

export default function HomePage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "" as string,
    submitterName: "",
    submitterEmail: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (form.title.length > 120)
      newErrors.title = "Title cannot exceed 120 characters";
    if (!form.description.trim())
      newErrors.description = "Description is required";
    if (form.description.trim().length < 20)
      newErrors.description = "Description must be at least 20 characters";
    if (!form.category) newErrors.category = "Please select a category";
    if (
      form.submitterEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.submitterEmail)
    )
      newErrors.submitterEmail = "Please enter a valid email";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitState("idle");
    try {
      await feedbackApi.submit(form);
      setSubmitState("success");
      setForm({
        title: "",
        description: "",
        category: "",
        submitterName: "",
        submitterEmail: "",
      });
      setErrors({});
    } catch (err: any) {
      setSubmitState("error");
      setErrorMessage(
        err?.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const descLen = form.description.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-slate-900">
              FeedPulse
            </span>
          </Link>
          <Link href="/login" className="btn-ghost text-slate-500">
            <LayoutDashboard className="h-4 w-4" />
            Admin
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-5xl px-6 pt-16 pb-8 text-center">
        <div className="badge bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20 mb-4 px-3 py-1">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          AI-Powered Analysis
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Share Your Feedback
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
          Help us build a better product. Every submission is automatically
          analysed and prioritised by AI so our team knows exactly what to focus
          on.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl px-6 pb-24">
        {submitState === "success" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">
                Feedback submitted!
              </p>
              <p className="mt-0.5 text-sm text-emerald-700">
                Thank you — our AI is already analysing your submission.
              </p>
            </div>
          </div>
        )}

        {submitState === "error" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Submission failed</p>
              <p className="mt-0.5 text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <MessageSquarePlus className="h-5 w-5 text-brand-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Submit Feedback
            </h2>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="label">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              className={`input ${errors.title ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              placeholder="Brief summary of your feedback"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              maxLength={120}
            />
            <div className="mt-1 flex justify-between">
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title}</p>
              )}
              <p className="ml-auto text-xs text-slate-400">
                {form.title.length}/120
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="label">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              rows={5}
              className={`input resize-none ${errors.description ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              placeholder="Describe your feedback in detail — what happened, what you expected, and any context that helps us understand..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <div className="mt-1 flex justify-between">
              {errors.description ? (
                <p className="text-xs text-red-500">{errors.description}</p>
              ) : (
                <p className="text-xs text-slate-400">Minimum 20 characters</p>
              )}
              <p
                className={`text-xs ${descLen > 0 && descLen < 20 ? "text-amber-500" : "text-slate-400"}`}
              >
                {descLen} character{descLen !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="label">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              className={`input ${!form.category ? "text-slate-400" : ""} ${errors.category ? "border-red-400" : ""}`}
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Optional fields */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label">
                Name{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="Your name"
                value={form.submitterName}
                onChange={(e) =>
                  setForm({ ...form, submitterName: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                className={`input ${errors.submitterEmail ? "border-red-400" : ""}`}
                placeholder="you@example.com"
                value={form.submitterEmail}
                onChange={(e) =>
                  setForm({ ...form, submitterEmail: e.target.value })
                }
              />
              {errors.submitterEmail && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.submitterEmail}
                </p>
              )}
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
