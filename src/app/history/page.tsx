"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { prettyDate } from "@/lib/utils";
import { DailyVerse } from "@/types";

export default function HistoryPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [verses, setVerses] = useState<DailyVerse[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("daily_verses")
        .select("*, submitted_by_profile:profiles!daily_verses_submitted_by_fkey(*)")
        .order("verse_date", { ascending: false });
      setVerses((data || []) as DailyVerse[]);
    }
    load();
  }, []);

  async function handleDelete(verse: DailyVerse) {
    if (!profile || profile.id !== verse.submitted_by) {
      setError("You can only delete verses you submitted.");
      return;
    }

    const confirmed = window.confirm("Delete this verse and its reflections?");
    if (!confirmed) return;

    setError("");

    try {
      await supabase.from("reflections").delete().eq("verse_id", verse.id);
      const { error: deleteError } = await supabase.from("daily_verses").delete().eq("id", verse.id);
      if (deleteError) {
        setError(deleteError.message || "Unable to delete this verse right now.");
        return;
      }
      setVerses((current) => current.filter((item) => item.id !== verse.id));
      router.refresh();
    } catch (deleteFailure) {
      setError("Unable to delete this verse right now.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return verses.filter((v) =>
      [v.bible_reference, v.verse_text, v.main_reflection, v.submitted_by_profile?.name]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [verses, search]);

  return (
    <AppShell>
      <Header title="Verse History" subtitle="Search and remember every verse you shared." />
      <input className="input mb-5" placeholder="Search verse, reference, person..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {error && <p className="card mb-5 bg-rose-50 text-rose-700">{error}</p>}

      <div className="space-y-4">
        {filtered.map((verse) => {
          const canManageVerse = Boolean(profile && verse.submitted_by === profile.id);
          return (
            <article key={verse.id} className="card">
              <Link href={`/reflection/${verse.id}`} className="block">
                <p className="text-sm text-sage-500">{prettyDate(verse.verse_date)} • {verse.submitted_by_profile?.name}</p>
                <h2 className="mt-2 text-xl font-bold text-sage-900">{verse.bible_reference}</h2>
                <p className="mt-2 line-clamp-3 italic text-sage-700">“{verse.verse_text}”</p>
              </Link>
              {canManageVerse && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/edit-verse/${verse.id}`} className="btn-secondary inline-block">Edit Verse</Link>
                  <button type="button" onClick={() => handleDelete(verse)} className="btn-secondary inline-block">Delete Verse</button>
                </div>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && <p className="card text-center text-sage-600">No verses found.</p>}
      </div>
    </AppShell>
  );
}
