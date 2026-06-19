"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { sendPushNotification } from "@/lib/push";
import { supabase } from "@/lib/supabase";
import { DailyVerse, Reflection } from "@/types";

const reactions = ["Read", "Amen", "Encouraged", "Prayed"];

export default function ReflectionPage() {
  const params = useParams();
  const router = useRouter();
  const verseId = params.id as string;
  const { profile, partner } = useAuth();

  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [reflectionText, setReflectionText] = useState("");
  const [reaction, setReaction] = useState("Amen");
  const [prayed, setPrayed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("daily_verses")
      .select("*, submitted_by_profile:profiles!daily_verses_submitted_by_fkey(*)")
      .eq("id", verseId)
      .single();
    setVerse(data as DailyVerse);

    const { data: refs } = await supabase
      .from("reflections")
      .select("*, profile:profiles(*)")
      .eq("verse_id", verseId)
      .order("created_at");
    setReflections((refs || []) as Reflection[]);
  }

  useEffect(() => { load(); }, [verseId]);

  const alreadySubmitted = reflections.some((r) => r.user_id === profile?.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setBusy(true);

    const { error } = await supabase.from("reflections").insert({
      verse_id: verseId,
      user_id: profile.id,
      reflection_text: reflectionText,
      read_status: true,
      prayed_status: prayed,
      reaction: reaction.toLowerCase()
    });

    if (!error && partner && partner.id !== profile.id) {
      await supabase.from("app_notifications").insert({
        user_id: partner.id,
        title: `${profile.name} completed today’s reflection`,
        message: "Your partner has read and reflected on today’s verse.",
        link: `/reflection/${verseId}`,
      });

      try {
        console.log("[reflection] sending push to partner", { partnerId: partner.id });
        const pushResponse = await sendPushNotification(
          partner.id,
          `${profile.name} completed today’s reflection`,
          "Your partner has read and reflected on today’s verse.",
          `/reflection/${verseId}`
        );
        console.log("[reflection] send-push response", { partnerId: partner.id, pushResponse });
      } catch (pushError) {
        console.error("[reflection] push send failed", { partnerId: partner.id, pushError });
      }
    } else if (!error && !partner) {
      console.warn("[reflection] no partner available for push notification", { profileId: profile.id });
    }

    setBusy(false);
    if (!error) {
      setReflectionText("");
      await load();
    }
  }

  return (
    <AppShell>
      <Header title="Reflection" subtitle="Read, reflect, and respond." />

      {verse && (
        <section className="card mb-5">
          <p className="text-sm text-sage-500">Shared by {verse.submitted_by_profile?.name}</p>
          <h2 className="mt-2 text-2xl font-bold">{verse.bible_reference}</h2>
          <p className="mt-4 whitespace-pre-line italic leading-8">“{verse.verse_text}”</p>
          <div className="mt-4 rounded-2xl bg-sage-50 p-4">
            <p className="font-semibold">Main reflection</p>
            <p>{verse.main_reflection}</p>
          </div>
        </section>
      )}

      <section className="card mb-5">
        <h3 className="mb-3 text-xl font-bold">Shared reflections</h3>
        {reflections.length === 0 ? (
          <p className="text-sage-600">No reflections yet.</p>
        ) : (
          <div className="space-y-3">
            {reflections.map((r) => (
              <div key={r.id} className="rounded-2xl bg-cream p-4">
                <p className="font-semibold">{r.profile?.name}</p>
                <p className="mt-1">{r.reflection_text}</p>
                <p className="mt-2 text-sm text-sage-500">
                  {r.reaction} {r.prayed_status ? "• Prayed" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {!alreadySubmitted && (
        <form onSubmit={submit} className="card space-y-4">
          <h3 className="text-xl font-bold">Write your reflection</h3>
          <textarea className="textarea min-h-28" value={reflectionText} onChange={(e) => setReflectionText(e.target.value)} placeholder="What did this verse teach you today?" required />
          <select className="input" value={reaction} onChange={(e) => setReaction(e.target.value)}>
            {reactions.map((r) => <option key={r}>{r}</option>)}
          </select>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prayed} onChange={(e) => setPrayed(e.target.checked)} />
            <span>I prayed about this</span>
          </label>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Saving..." : "Submit Reflection"}
          </button>
        </form>
      )}
    </AppShell>
  );
}
