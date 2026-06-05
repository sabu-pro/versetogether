"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { DailyVerse } from "@/types";

export default function EditVersePage() {
  const params = useParams();
  const router = useRouter();
  const verseId = params.id as string;
  const { profile } = useAuth();

  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [bibleReference, setBibleReference] = useState("");
  const [verseText, setVerseText] = useState("");
  const [mainReflection, setMainReflection] = useState("");
  const [prayerNote, setPrayerNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error: loadError } = await supabase
        .from("daily_verses")
        .select("*")
        .eq("id", verseId)
        .maybeSingle();

      if (loadError || !data) {
        setError("This verse could not be found.");
        return;
      }

      setVerse(data as DailyVerse);
      setBibleReference(data.bible_reference || "");
      setVerseText(data.verse_text || "");
      setMainReflection(data.main_reflection || "");
      setPrayerNote(data.prayer_note || "");
    }

    load();
  }, [verseId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !verse) {
      setError("You must be signed in to edit this verse.");
      return;
    }

    if (verse.submitted_by !== profile.id) {
      setError("You can only edit verses you submitted.");
      return;
    }

    setBusy(true);
    setError("");

    const { error: updateError } = await supabase
      .from("daily_verses")
      .update({
        bible_reference: bibleReference,
        verse_text: verseText,
        main_reflection: mainReflection,
        prayer_note: prayerNote || null
      })
      .eq("id", verseId);

    setBusy(false);

    if (updateError) {
      setError(updateError.message || "Unable to update this verse right now.");
      return;
    }

    router.push("/dashboard");
  }

  if (!verse && !error) {
    return (
      <AppShell>
        <Header title="Edit Verse" subtitle="Loading your verse..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Edit Verse" subtitle="Update your shared verse and reflection." />

      {error && <p className="card mb-5 bg-rose-50 text-rose-700">{error}</p>}

      {verse && verse.submitted_by !== profile?.id ? (
        <section className="card">
          <p className="text-sage-700">You can only edit verses you submitted yourself.</p>
        </section>
      ) : (
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="mb-1 block font-semibold text-sage-900">Bible reference</label>
            <input className="input" value={bibleReference} onChange={(e) => setBibleReference(e.target.value)} required />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-sage-900">Verse text</label>
            <textarea className="textarea min-h-32" value={verseText} onChange={(e) => setVerseText(e.target.value)} required />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-sage-900">Main reflection</label>
            <textarea className="textarea min-h-28" value={mainReflection} onChange={(e) => setMainReflection(e.target.value)} required />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-sage-900">Prayer note, optional</label>
            <textarea className="textarea min-h-24" value={prayerNote} onChange={(e) => setPrayerNote(e.target.value)} />
          </div>

          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}
    </AppShell>
  );
}
