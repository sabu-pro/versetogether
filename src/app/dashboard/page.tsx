"use client";
import DashboardAnalytics from "@/components/DashboardAnalytics";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cleanupVerseNotifications } from "@/lib/notifications";
import { getResponsibleProfile, greetingWithName, isWeekend, prettyDate, todayString } from "@/lib/utils";
import { DailyVerse, Reflection } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { profile, profiles, profileReady } = useAuth();
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  const responsible = getResponsibleProfile(profiles);
  const myTurn = responsible?.id === profile?.id;

  async function load() {
    if (!profile?.couple_id) return;

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
    } else {
      setReflections([]);
    }
  }

  useEffect(() => {
    if (!profileReady || !profile?.couple_id) return;
    setPageLoading(true);
    load().finally(() => setPageLoading(false));
  }, [profileReady, profile?.couple_id]);

  const hasMyReflection = reflections.some((r) => r.user_id === profile?.id);
  const canManageVerse = Boolean(profile && verse && verse.submitted_by === profile.id);

  async function handleDeleteVerse() {
    if (!verse || !profile) return;
    if (verse.submitted_by !== profile.id) {
      setError("You can only delete verses you submitted.");
      return;
    }

    const confirmed = window.confirm("Delete this verse and its reflections?");
    if (!confirmed) return;

    setError("");

    try {
      const { error: reflectionsError } = await supabase
        .from("reflections")
        .delete()
        .eq("verse_id", verse.id);

      if (reflectionsError) {
        console.error("Delete verse failed while removing reflections", reflectionsError);
        setError(reflectionsError.message || "Unable to delete this verse right now.");
        return;
      }

      try {
        await cleanupVerseNotifications(verse.id);
      } catch (notificationError) {
        console.error("Delete verse cleanup failed", notificationError);
      }

      const { error: deleteError } = await supabase
        .from("daily_verses")
        .delete()
        .eq("id", verse.id)
        .eq("submitted_by", profile.id);

      if (deleteError) {
        console.error("Delete verse failed", deleteError);
        setError(deleteError.message || "Unable to delete this verse right now.");
        return;
      }

      setVerse(null);
      setReflections([]);
      router.refresh();
      router.push("/dashboard");
    } catch (deleteFailure) {
      console.error("Delete verse failed unexpectedly", deleteFailure);
      setError("Unable to delete this verse right now.");
    }
  }

  return (
    <AppShell>
      <Header
        title={greetingWithName(profile?.name)}
        subtitle={prettyDate(new Date())}
        avatarUrl={profile?.avatar_url}
        avatarName={profile?.name}
      />

      {pageLoading ? (
  <section className="card text-center text-sage-600">Loading today&apos;s verse...</section>
) : (
  <>
  <DashboardAnalytics />

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
            <p className="mt-2 text-sm text-sage-600">Growing together through prayer, reflection, and God’s Word.</p>
          </div>
          <div className="rounded-2xl bg-white/90 px-3 py-2 text-right shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-sage-500">Focus</p>
            <p className="text-sm font-semibold text-sage-800">Peace & prayer</p>
          </div>
        </div>
      </section>

      {error && <p className="card mb-5 bg-rose-50 text-rose-700">{error}</p>}

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
            <Link href="/add-verse" className="btn btn-primary mt-5 inline-block">
              Add Today’s Verse
            </Link>
          )}
        </section>
      ) : (
        <section className="card">
          <div className="flex items-start justify-between gap-3">
            <p className="badge-pill">Shared by {verse.submitted_by_profile?.name || "Partner"}</p>
            {canManageVerse && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/edit-verse/${verse.id}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-white/90 text-[#111111] shadow-sm transition hover:bg-[#fff1f6]"
                  aria-label="Edit verse"
                  title="Edit verse"
                >
                  <Pencil size={16} />
                </Link>
                <button
                  type="button"
                  onClick={handleDeleteVerse}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-white/90 text-[#111111] shadow-sm transition hover:bg-[#fff1f6]"
                  aria-label="Delete verse"
                  title="Delete verse"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
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
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/reflection/${verse.id}`} className="btn btn-primary inline-block">
              {hasMyReflection ? "View Reflections" : "Write Your Reflection"}
            </Link>
          </div>
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
        </>
      )}
    </AppShell>
  );
}
