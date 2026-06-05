"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getResponsibleProfile, isWeekend, prettyDate, todayString } from "@/lib/utils";
import { DailyVerse, Reflection } from "@/types";

export default function DashboardPage() {
  const { profile, profiles } = useAuth();
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [reflections, setReflections] = useState<Reflection[]>([]);

  const responsible = getResponsibleProfile(profiles);
  const myTurn = responsible?.id === profile?.id;

  async function load() {
    const { data } = await supabase
      .from("daily_verses")
      .select("*, submitted_by_profile:profiles!daily_verses_submitted_by_fkey(*)")
      .eq("verse_date", todayString())
      .maybeSingle();

    setVerse(data as DailyVerse | null);

    if (data?.id) {
      const { data: refs } = await supabase
        .from("reflections")
        .select("*, profile:profiles(*)")
        .eq("verse_id", data.id)
        .order("created_at");
      setReflections((refs || []) as Reflection[]);
    }
  }

  useEffect(() => { load(); }, []);

  const hasMyReflection = reflections.some((r) => r.user_id === profile?.id);

  return (
    <AppShell>
      <Header
        title={`Good day, ${profile?.name || "friend"}`}
        subtitle={prettyDate(new Date())}
      />

      <section className="soft-card mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="badge-pill">Today’s responsibility</p>
            {isWeekend() ? (
              <h2 className="mt-3 text-xl font-bold text-sage-900">Weekend rest day, optional sharing</h2>
            ) : (
              <h2 className="mt-3 text-xl font-bold text-sage-900">
                {myTurn ? "It is your turn to share God’s Word" : `${responsible?.name || "Your partner"} will share today`}
              </h2>
            )}
            <p className="mt-2 text-sm text-sage-600">A calm, simple rhythm for reflection and prayer.</p>
          </div>
          <div className="rounded-2xl bg-white/90 px-3 py-2 text-right shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-sage-500">Focus</p>
            <p className="text-sm font-semibold text-sage-800">Peace & prayer</p>
          </div>
        </div>
      </section>

      {!verse ? (
        <section className="card text-center">
          <p className="badge-pill">No verse shared yet</p>
          <h2 className="mt-3 text-2xl font-bold text-sage-900">A quiet space for today’s Word</h2>
          <p className="mt-2 text-sage-600">
            {myTurn || isWeekend()
              ? "Share today’s verse, reflection, and optional prayer note."
              : `Waiting for ${responsible?.name || "your partner"} to share.`}
          </p>
          {(myTurn || isWeekend()) && (
            <Link href="/add-verse" className="btn-primary mt-5 inline-block">
              Add Today’s Verse
            </Link>
          )}
        </section>
      ) : (
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <p className="badge-pill">Shared by {verse.submitted_by_profile?.name || "Partner"}</p>
            <span className="rounded-full bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-700">Today</span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-sage-900">{verse.bible_reference}</h2>
          <p className="mt-4 whitespace-pre-line text-lg italic leading-8 text-sage-800">
            “{verse.verse_text}”
          </p>
          <div className="mt-5 rounded-2xl bg-sage-50 p-4">
            <p className="font-semibold text-sage-900">Main reflection</p>
            <p className="mt-1 whitespace-pre-line text-sage-700">{verse.main_reflection}</p>
          </div>
          {verse.prayer_note && (
            <div className="mt-3 rounded-2xl bg-rose-50 p-4">
              <p className="font-semibold text-rose-700">Prayer note</p>
              <p className="mt-1 whitespace-pre-line text-rose-700">{verse.prayer_note}</p>
            </div>
          )}
          <Link href={`/reflection/${verse.id}`} className="btn-primary mt-5 inline-block">
            {hasMyReflection ? "View Reflections" : "Write Your Reflection"}
          </Link>
        </section>
      )}

      {reflections.length > 0 && (
        <section className="mt-5 card">
          <h3 className="mb-3 text-xl font-bold">Today’s reflections</h3>
          <div className="space-y-3">
            {reflections.map((r) => (
              <div key={r.id} className="rounded-2xl bg-cream p-4">
                <p className="font-semibold">{r.profile?.name || "User"}</p>
                <p className="mt-1 text-sage-700">{r.reflection_text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
