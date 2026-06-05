"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PrayerRequest } from "@/types";
import { prettyDate } from "@/lib/utils";

export default function PrayersPage() {
  const { profile } = useAuth();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [text, setText] = useState("");

  async function load() {
    const { data } = await supabase
      .from("prayer_requests")
      .select("*, profile:profiles(*)")
      .order("created_at", { ascending: false });
    setPrayers((data || []) as PrayerRequest[]);
  }

  useEffect(() => { load(); }, []);

  async function addPrayer(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    await supabase.from("prayer_requests").insert({ user_id: profile.id, request_text: text });
    setText("");
    load();
  }

  async function markAnswered(id: string) {
    await supabase.from("prayer_requests").update({ is_answered: true, answered_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  return (
    <AppShell>
      <Header title="Prayer Requests" subtitle="Pray together and remember answered prayers." />

      <form onSubmit={addPrayer} className="card mb-5 space-y-3">
        <textarea className="textarea min-h-24" placeholder="Add a prayer request..." value={text} onChange={(e) => setText(e.target.value)} required />
        <button className="btn btn-primary w-full">Add Prayer</button>
      </form>

      <div className="space-y-4">
        {prayers.map((p) => (
          <div key={p.id} className={`card ${p.is_answered ? "bg-sage-50" : ""}`}>
            <p className="text-sm text-sage-500">{p.profile?.name} • {prettyDate(p.created_at)}</p>
            <p className={`mt-2 ${p.is_answered ? "line-through text-sage-500" : ""}`}>{p.request_text}</p>
            {p.is_answered ? (
              <p className="mt-3 text-sm font-semibold text-sage-700">Answered {p.answered_at ? prettyDate(p.answered_at) : ""}</p>
            ) : (
              <button onClick={() => markAnswered(p.id)} className="btn btn-secondary mt-4">Mark Answered</button>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
