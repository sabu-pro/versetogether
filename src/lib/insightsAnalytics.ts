import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type MonthlyBreakdownItem = {
  month: string;
  count: number;
};

type InsightsAnalyticsStats = {
  totalVerses: number;
  firstVerseDate: string | null;
  firstVerseDateLabel: string;
  thisMonthVerses: number;
  mostSharedBookName: string;
  mostSharedBookCount: number;
  daysGrowingTogether: number;
  monthlyBreakdown: MonthlyBreakdownItem[];
};

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });

function formatDateLabel(value: string | null) {
  if (!value) return "Not shared yet";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function getCurrentMonthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getCurrentMonthEnd() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().slice(0, 10);
}

function getMonthLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return monthFormatter.format(date);
}

export function useInsightsAnalytics(coupleId: string | null | undefined) {
  const [stats, setStats] = useState<InsightsAnalyticsStats>({
    totalVerses: 0,
    firstVerseDate: null,
    firstVerseDateLabel: "Not shared yet",
    thisMonthVerses: 0,
    mostSharedBookName: "No data yet",
    mostSharedBookCount: 0,
    daysGrowingTogether: 0,
    monthlyBreakdown: [],
  });
  const [loading, setLoading] = useState(Boolean(coupleId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!coupleId) {
      setStats({
        totalVerses: 0,
        firstVerseDate: null,
        firstVerseDateLabel: "Not shared yet",
        thisMonthVerses: 0,
        mostSharedBookName: "No data yet",
        mostSharedBookCount: 0,
        daysGrowingTogether: 0,
        monthlyBreakdown: [],
      });
      setLoading(false);
      setError(null);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const monthStart = getCurrentMonthStart();
        const monthEnd = getCurrentMonthEnd();

        const [versesResult, monthlyResult, bookResult] = await Promise.all([
          supabase
            .from("daily_verses")
            .select("verse_date, bible_reference", { count: "exact", head: false })
            .eq("couple_id", coupleId)
            .order("verse_date", { ascending: true }),
          supabase
            .from("daily_verses")
            .select("verse_date", { count: "exact", head: false })
            .eq("couple_id", coupleId)
            .gte("verse_date", monthStart)
            .lt("verse_date", monthEnd),
          supabase
            .from("daily_verses")
            .select("bible_reference")
            .eq("couple_id", coupleId),
        ]);

        if (!active) return;

        if (versesResult.error || monthlyResult.error || bookResult.error) {
          throw versesResult.error || monthlyResult.error || bookResult.error;
        }

        const verses = (versesResult.data || []) as Array<{ verse_date: string; bible_reference: string }>;
        const monthlyVerses = (monthlyResult.data || []) as Array<{ verse_date: string }>;
        const bookReferences = (bookResult.data || []) as Array<{ bible_reference: string }>;

        const bookCounts = bookReferences.reduce<Record<string, number>>((acc, item) => {
          const book = (item.bible_reference || "").split(":")[0]?.trim() || "Unknown";
          acc[book] = (acc[book] || 0) + 1;
          return acc;
        }, {});

        const mostSharedBookName = Object.entries(bookCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "No data yet";
        const mostSharedBookCount = Object.entries(bookCounts).sort((a, b) => b[1] - a[1])[0]?.[1] || 0;

        const monthlyBreakdown = verses.reduce<Record<string, number>>((acc, item) => {
          if (!item.verse_date) return acc;
          const month = item.verse_date.slice(0, 7);
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(monthlyBreakdown)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, count]) => ({ month: getMonthLabel(month), count }));

        const firstVerseDate = verses[0]?.verse_date ?? null;
        const daysGrowingTogether = firstVerseDate
          ? Math.max(1, Math.floor((Date.now() - new Date(`${firstVerseDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)) + 1)
          : 0;

        setStats({
          totalVerses: verses.length,
          firstVerseDate,
          firstVerseDateLabel: formatDateLabel(firstVerseDate),
          thisMonthVerses: monthlyVerses.length,
          mostSharedBookName,
          mostSharedBookCount,
          daysGrowingTogether,
          monthlyBreakdown: chartData,
        });
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unable to load analytics right now.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [coupleId]);

  return { stats, loading, error };
}
