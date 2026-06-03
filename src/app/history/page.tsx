"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { prettyDate } from "@/lib/utils";
import { DailyVerse } from "@/types";

export default function HistoryPage() {
  const [verses, setVerses] = useState<DailyVerse[]>([]);
  const [search, setSearch] = useState("");

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

      <div className="space-y-4">
        {filtered.map((verse) => (
          <Link key={verse.id} href={`/reflection/${verse.id}`} className="card block">
            <p className="text-sm text-sage-500">{prettyDate(verse.verse_date)} • {verse.submitted_by_profile?.name}</p>
            <h2 className="mt-2 text-xl font-bold">{verse.bible_reference}</h2>
            <p className="mt-2 line-clamp-3 italic text-sage-700">“{verse.verse_text}”</p>
          </Link>
        ))}
        {filtered.length === 0 && <p className="card text-center text-sage-600">No verses found.</p>}
      </div>
    </AppShell>
  );
}
