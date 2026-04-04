"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  LogOut,
  ArrowLeft,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("feedpulse_token");
    if (!token) {
      router.push("/login");
    } else {
      setAuthed(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("feedpulse_token");
    router.push("/login");
  };

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-slate-900">
                FeedPulse
              </span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-medium text-slate-600">
              Admin Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="btn-ghost text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Feedback Form
            </Link>
            <button onClick={handleLogout} className="btn-ghost text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
