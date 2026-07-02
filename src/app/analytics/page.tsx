"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays, Compass, Heart, Sparkles } from "lucide-react";
import { useMemo } from "react";
import AnalyticsStatCard from "@/components/AnalyticsStatCard";
import MonthlyVersesChart from "@/components/MonthlyVersesChart";
import { useAuth } from "@/lib/auth";
import { useInsightsAnalytics } from "@/lib/insightsAnalytics";

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const { stats, loading, error } = useInsightsAnalytics(profile?.couple_id);

  const chartData = useMemo(() => {
    return stats.monthlyBreakdown.map((item) => ({ month: item.month, count: item.count }));
  }, [stats.monthlyBreakdown]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,240,245,0.9),_transparent_45%),linear-gradient(135deg,_#fcfbf7_0%,_#f8fafc_100%)] px-4 py-6 text-sage-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-sage-700 shadow-sm">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        <section className="rounded-[28px] border border-rose-100/70 bg-white/90 p-6 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.25)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700">
                <Heart size={15} /> Our Journey
              </p>
              <h1 className="mt-3 text-3xl font-bold text-sage-900">A closer look at your growth together</h1>
              <p className="mt-2 max-w-2xl text-sm text-sage-600">
                Track your shared verses, celebrate consistency, and see how your journey unfolds over time.
              </p>
            </div>
            <div className="rounded-2xl border border-sage-100 bg-sage-50/70 px-4 py-3 text-sm text-sage-700">
              <p className="font-semibold">Insight Mode</p>
              <p className="mt-1">Personal reflections, made visible</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-3xl border border-slate-200 bg-white/80" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AnalyticsStatCard
                title="Total Verses Shared"
                value={stats.totalVerses}
                subtitle="All verses from your couple’s journey"
                icon={<BookOpen size={18} />}
                accent="rose"
              />
              <AnalyticsStatCard
                title="Journey Started"
                value={stats.firstVerseDateLabel}
                subtitle="First verse shared together"
                icon={<CalendarDays size={18} />}
                accent="sage"
              />
              <AnalyticsStatCard
                title="This Month"
                value={stats.thisMonthVerses}
                subtitle="Verses shared in the current month"
                icon={<Sparkles size={18} />}
                accent="amber"
              />
              <AnalyticsStatCard
                title="Days Growing Together"
                value={stats.daysGrowingTogether}
                subtitle="From first verse to today"
                icon={<Compass size={18} />}
                accent="blue"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <MonthlyVersesChart data={chartData} />
              <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
                <p className="text-sm font-semibold text-sage-700">Most Shared Bible Book</p>
                <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                  <p className="text-3xl font-bold text-sage-900">{stats.mostSharedBookName}</p>
                  <p className="mt-2 text-sm text-sage-600">{stats.mostSharedBookCount} verses shared</p>
                </div>
                <p className="mt-4 text-sm text-sage-600">
                  This highlights the book your couple returns to most often in your shared journey.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
