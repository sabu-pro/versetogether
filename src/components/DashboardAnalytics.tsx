"use client";
import Link from "next/link";
import { BookOpen, Heart, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../lib/auth";
import { useDashboardAnalytics } from "../lib/dashboardAnalytics";

export default function DashboardAnalytics() {
  const { profile } = useAuth();
  const { stats, loading, error } = useDashboardAnalytics(profile?.couple_id);

  const firstVerseLabel = stats.firstVerseDate
    ? format(new Date(`${stats.firstVerseDate}T00:00:00`), "d MMM yyyy")
    : "Not shared yet";

  return (
    <section className="soft-card mb-5 overflow-hidden border border-rose-100/70 bg-[linear-gradient(135deg,_rgba(255,245,247,0.95),_rgba(255,255,255,0.95))]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="badge-pill inline-flex items-center gap-2">
            <Heart size={14} /> Our Journey
          </p>
          <p className="mt-3 text-lg font-semibold text-sage-900">A gentle snapshot of your shared growth</p>
        </div>
        <Link href="/analytics" className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/90 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50">
          <Sparkles size={14} /> View Insights
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-rose-100 bg-white/90 p-4 shadow-sm">
            <div className="h-4 w-24 rounded bg-rose-50" />
            <div className="mt-3 h-8 w-16 rounded bg-rose-50" />
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white/90 p-4 shadow-sm">
            <div className="h-4 w-24 rounded bg-rose-50" />
            <div className="mt-3 h-8 w-24 rounded bg-rose-50" />
          </div>
        </div>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-700">{error}</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-rose-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-sage-700">
              <BookOpen size={16} /> Total Verses Shared
            </div>
            <p className="mt-3 text-3xl font-bold text-sage-900">{stats.totalVerses}</p>
            <p className="mt-1 text-sm text-sage-600">Shared with your partner so far</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-sage-700">
              <Sparkles size={16} /> First Verse Shared
            </div>
            <p className="mt-3 text-2xl font-bold text-sage-900">{firstVerseLabel}</p>
            <p className="mt-1 text-sm text-sage-600">Your journey began on this day</p>
          </div>
        </div>
      )}
    </section>
  );
}