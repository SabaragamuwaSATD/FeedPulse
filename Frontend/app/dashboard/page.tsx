"use client";

import { useEffect, useState, useCallback } from "react";
import { feedbackApi, type Feedback, type PaginationInfo } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/utils";
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  RefreshCw,
  BarChart3,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Tag,
  Sparkles,
  X,
  Eye,
} from "lucide-react";

const CATEGORIES = ["Bug", "Feature Request", "Improvement", "Other"];
const STATUSES = ["New", "In Review", "Resolved"];
const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-50 text-blue-700 ring-blue-600/20",
  "In Review": "bg-amber-50 text-amber-700 ring-amber-600/20",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};
const SENTIMENT_COLORS: Record<string, string> = {
  Positive: "badge-positive",
  Negative: "badge-negative",
  Neutral: "badge-neutral",
};
const CATEGORY_ICONS: Record<string, string> = {
  Bug: "🐛",
  "Feature Request": "✨",
  Improvement: "📈",
  Other: "📝",
};

export default function DashboardPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<Feedback | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10, sort };
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;
      if (search.trim()) params.search = search.trim();

      const res = await feedbackApi.getAll(params);
      setFeedback(res.data.data.feedback);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
    } finally {
      setLoading(false);
    }
  }, [page, sort, filterCategory, filterStatus, search]);

  const fetchStats = async () => {
    try {
      const res = await feedbackApi.getStats();
      setStats(res.data.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      await feedbackApi.updateStatus(id, newStatus);
      setFeedback((prev) =>
        prev.map((f) => (f._id === id ? { ...f, status: newStatus as any } : f))
      );
      if (selectedItem?._id === id) {
        setSelectedItem({ ...selectedItem, status: newStatus as any });
      }
      fetchStats();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    setActionLoading(id);
    try {
      await feedbackApi.delete(id);
      setFeedback((prev) => prev.filter((f) => f._id !== id));
      if (selectedItem?._id === id) setSelectedItem(null);
      fetchStats();
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReanalyse = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await feedbackApi.reanalyse(id);
      const updated = res.data.data;
      setFeedback((prev) =>
        prev.map((f) => (f._id === id ? updated : f))
      );
      if (selectedItem?._id === id) setSelectedItem(updated);
    } catch (err) {
      console.error("Failed to reanalyse:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateSummary = async () => {
    setShowSummary(true);
    setSummaryLoading(true);
    try {
      const res = await feedbackApi.getSummary();
      setSummary(res.data.data);
    } catch (err) {
      console.error("Failed to generate summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFeedback();
  };

  const clearFilters = () => {
    setSearch("");
    setFilterCategory("");
    setFilterStatus("");
    setSort("-createdAt");
    setPage(1);
  };

  const hasFilters = search || filterCategory || filterStatus || sort !== "-createdAt";

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Stats Bar (Req 3.8) */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="card flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
              <MessageSquare className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalFeedback}</p>
              <p className="text-xs text-slate-500">Total Feedback</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.openItems}</p>
              <p className="text-xs text-slate-500">Open Items</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.avgPriority}</p>
              <p className="text-xs text-slate-500">Avg Priority</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Tag className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.mostCommonTag}</p>
              <p className="text-xs text-slate-500">Top Tag</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search (Req 3.7) */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-9 pr-4"
              placeholder="Search title or summary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          {/* Category Filter (Req 3.3) */}
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              className="input w-auto min-w-[140px]"
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter (Req 3.4) */}
          <select
            className="input w-auto min-w-[130px]"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Sort (Req 3.6) */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            <select
              className="input w-auto min-w-[150px]"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="-createdAt">Newest First</option>
              <option value="createdAt">Oldest First</option>
              <option value="priority">Highest Priority</option>
              <option value="-priority">Lowest Priority</option>
              <option value="sentiment">Sentiment A-Z</option>
            </select>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost text-xs">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}

          {/* AI Summary Button (Req 2.5) */}
          <button onClick={handleGenerateSummary} className="btn-primary text-xs ml-auto">
            <Sparkles className="h-3.5 w-3.5" />
            AI Summary
          </button>
        </div>
      </div>

      {/* AI Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="card relative max-h-[80vh] w-full max-w-lg overflow-auto">
            <button
              onClick={() => setShowSummary(false)}
              className="absolute right-4 top-4 rounded-lg p-1 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-brand-600" />
              <h2 className="font-display text-lg font-bold">AI Trend Summary</h2>
            </div>
            {summaryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                <span className="ml-2 text-sm text-slate-500">
                  Analysing feedback trends...
                </span>
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Based on {summary.feedbackCount} submissions in the last 7 days
                </p>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Top Themes</h3>
                  {summary.summary?.themes?.map((t: any, i: number) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">
                          {i + 1}. {t.theme}
                        </span>
                        <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-600/20">
                          {t.count} items
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {t.description}
                      </p>
                    </div>
                  ))}
                </div>
                {summary.summary?.overall_sentiment && (
                  <p className="text-sm text-slate-600">
                    <strong>Overall Sentiment:</strong>{" "}
                    {summary.summary.overall_sentiment}
                  </p>
                )}
                {summary.summary?.recommendations?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">
                      Recommendations
                    </h3>
                    <ul className="space-y-1">
                      {summary.summary.recommendations.map(
                        (r: string, i: number) => (
                          <li key={i} className="text-sm text-slate-600">
                            • {r}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Could not generate summary.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Feedback List (Req 3.2) */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="card py-16 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No feedback found</p>
          </div>
        ) : (
          feedback.map((item) => (
            <div
              key={item._id}
              className="card group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-base">{CATEGORY_ICONS[item.category] || "📝"}</span>
                    <h3 className="font-semibold text-slate-900 truncate">
                      {item.title}
                    </h3>
                  </div>
                  {item.ai_summary && (
                    <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                      {item.ai_summary}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`badge ring-1 ring-inset ${STATUS_COLORS[item.status]}`}
                    >
                      {item.status}
                    </span>
                    {/* Sentiment Badge (Req 2.4) */}
                    {item.ai_sentiment && (
                      <span className={SENTIMENT_COLORS[item.ai_sentiment] || "badge-neutral"}>
                        {item.ai_sentiment}
                      </span>
                    )}
                    {/* Priority Score */}
                    {item.ai_priority && (
                      <span
                        className={`badge ring-1 ring-inset ${
                          item.ai_priority >= 8
                            ? "bg-red-50 text-red-700 ring-red-600/20"
                            : item.ai_priority >= 5
                              ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                              : "bg-slate-50 text-slate-600 ring-slate-400/20"
                        }`}
                      >
                        P{item.ai_priority}
                      </span>
                    )}
                    {/* Category */}
                    <span className="badge bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                    {/* Tags */}
                    {item.ai_tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-600/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400">
                    {timeAgo(item.createdAt)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Status update dropdown */}
                    <select
                      className="input w-auto text-xs py-1 px-2"
                      value={item.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(item._id, e.target.value);
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {/* Reanalyse (Req 2.6) */}
                    <button
                      className="btn-ghost p-1"
                      title="Re-analyse with AI"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReanalyse(item._id);
                      }}
                      disabled={actionLoading === item._id}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${actionLoading === item._id ? "animate-spin" : ""}`}
                      />
                    </button>
                    {/* Delete */}
                    <button
                      className="btn-ghost p-1 text-red-500 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item._id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination (Req 3.9) */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              className="btn-ghost"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === pagination.totalPages ||
                  Math.abs(p - page) <= 1
              )
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-slate-300">...</span>
                  )}
                  <button
                    className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-brand-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              className="btn-ghost"
              disabled={page === pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="card relative max-h-[80vh] w-full max-w-xl overflow-auto">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute right-4 top-4 rounded-lg p-1 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {CATEGORY_ICONS[selectedItem.category] || "📝"}
                </span>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {selectedItem.title}
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                {formatDate(selectedItem.createdAt)}
                {selectedItem.submitterName &&
                  ` • by ${selectedItem.submitterName}`}
                {selectedItem.submitterEmail &&
                  ` (${selectedItem.submitterEmail})`}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 mb-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {selectedItem.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`badge ring-1 ring-inset ${STATUS_COLORS[selectedItem.status]}`}>
                {selectedItem.status}
              </span>
              {selectedItem.ai_sentiment && (
                <span className={SENTIMENT_COLORS[selectedItem.ai_sentiment]}>
                  {selectedItem.ai_sentiment}
                </span>
              )}
              {selectedItem.ai_priority && (
                <span className="badge bg-slate-100 text-slate-700">
                  Priority: {selectedItem.ai_priority}/10
                </span>
              )}
              <span className="badge bg-slate-100 text-slate-600">
                {selectedItem.category}
              </span>
            </div>

            {selectedItem.ai_summary && (
              <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 mb-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                  <span className="text-xs font-semibold text-brand-700">
                    AI Summary
                  </span>
                </div>
                <p className="text-sm text-brand-900">
                  {selectedItem.ai_summary}
                </p>
              </div>
            )}

            {selectedItem.ai_tags && selectedItem.ai_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selectedItem.ai_tags.map((tag) => (
                  <span
                    key={tag}
                    className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-600/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
              <select
                className="input w-auto text-sm"
                value={selectedItem.status}
                onChange={(e) =>
                  handleStatusUpdate(selectedItem._id, e.target.value)
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={() => handleReanalyse(selectedItem._id)}
                className="btn-secondary text-sm"
                disabled={actionLoading === selectedItem._id}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${actionLoading === selectedItem._id ? "animate-spin" : ""}`}
                />
                Re-analyse
              </button>
              <button
                onClick={() => handleDelete(selectedItem._id)}
                className="btn-danger text-sm ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
