import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type DashboardAnalyticsStats = {
  totalVerses: number;
  firstVerseDate: string | null;
};

export function useDashboardAnalytics(coupleId: string | null | undefined) {
  const [stats, setStats] = useState<DashboardAnalyticsStats>({
    totalVerses: 0,
    firstVerseDate: null,
  });
  const [loading, setLoading] = useState(Boolean(coupleId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!coupleId) {
      setStats({ totalVerses: 0, firstVerseDate: null });
      setLoading(false);
      setError(null);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [{ count, error: countError }, { data, error: dateError }] = await Promise.all([
          supabase
            .from("daily_verses")
            .select("*", { count: "exact", head: true })
            .eq("couple_id", coupleId),

          supabase
            .from("daily_verses")
            .select("verse_date")
            .eq("couple_id", coupleId)
            .order("verse_date", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!active) return;

        if (countError || dateError) {
          throw countError || dateError;
        }

        setStats({
          totalVerses: count ?? 0,
          firstVerseDate: data?.verse_date ?? null,
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
