"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/lib/push";
import { getResponsibleProfile, isWeekend, todayString } from "@/lib/utils";

export default function AddVersePage() {
  const router = useRouter();
  const { profile, partner, profiles } = useAuth();
  const responsible = getResponsibleProfile(profiles);
  const myTurn = responsible?.id === profile?.id;

  const [bibleReference, setBibleReference] = useState("");
  const [verseText, setVerseText] = useState("");
  const [mainReflection, setMainReflection] = useState("");
  const [prayerNote, setPrayerNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (!myTurn && !isWeekend()) {
      setError("Today is not your turn to share the main verse.");
      return;
    }

    setBusy(true);
    setError("");

    const { data: verse, error: verseError } = await supabase
      .from("daily_verses")
      .insert({
        verse_date: todayString(),
        responsible_user_id: responsible?.id || profile.id,
        bible_reference: bibleReference,
        verse_text: verseText,
        main_reflection: mainReflection,
        prayer_note: prayerNote || null,
        submitted_by: profile.id
      })
      .select()
      .single();

    if (verseError) {
      setBusy(false);
      setError(verseError.message);
      return;
    }

    if (partner) {
      await supabase.from("app_notifications").insert({
        user_id: partner.id,
        title: `${profile.name} shared today’s Bible verse`,
        message: "Please read and write your reflection.",
        link: `/reflection/${verse.id}`
      });
      await sendPushNotification(
        partner.id,
        `${profile.name} shared today’s Bible verse`,
        "Please read and write your reflection.",
        `/reflection/${verse.id}`
      );
    }

    setBusy(false);
    router.push("/dashboard");
  }

  return (
    <AppShell>
      <Header title="Add Today’s Verse" subtitle="Share the verse God placed on your heart." />

      <form onSubmit={submit} className="card space-y-4">
        {error && <p className="rounded-2xl bg-rose-50 p-3 text-rose-700">{error}</p>}

        <div>
          <label className="mb-1 block font-semibold">Bible reference</label>
          <input className="input" placeholder="Example: Proverbs 3:5-6" value={bibleReference} onChange={(e) => setBibleReference(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1 block font-semibold">Verse text</label>
          <textarea className="textarea min-h-32" placeholder="Paste or type the verse here" value={verseText} onChange={(e) => setVerseText(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1 block font-semibold">Your reflection</label>
          <textarea className="textarea min-h-28" placeholder="Why did you choose this verse?" value={mainReflection} onChange={(e) => setMainReflection(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1 block font-semibold">Prayer note, optional</label>
          <textarea className="textarea min-h-24" placeholder="Write a small prayer or encouragement" value={prayerNote} onChange={(e) => setPrayerNote(e.target.value)} />
        </div>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Sharing..." : "Share Verse"}
        </button>
      </form>
    </AppShell>
  );
}
