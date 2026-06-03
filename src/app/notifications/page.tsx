"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppNotification } from "@/types";
import { prettyDate } from "@/lib/utils";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  async function load() {
    if (!profile) return;
    const { data } = await supabase
      .from("app_notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    setItems((data || []) as AppNotification[]);
  }

  useEffect(() => { load(); }, [profile?.id]);

  async function markRead(id: string) {
    await supabase.from("app_notifications").update({ is_read: true }).eq("id", id);
    load();
  }

  return (
    <AppShell>
      <Header title="Notifications" subtitle="Verse alerts and reflection updates." />

      <div className="space-y-4">
        {items.map((n) => (
          <div key={n.id} className={`card ${!n.is_read ? "border-sage-400 bg-sage-50" : ""}`}>
            <p className="text-sm text-sage-500">{prettyDate(n.created_at)}</p>
            <h2 className="mt-1 text-xl font-bold">{n.title}</h2>
            <p className="mt-1 text-sage-700">{n.message}</p>
            <div className="mt-4 flex gap-3">
              {n.link && <Link className="btn-primary" href={n.link}>Open</Link>}
              {!n.is_read && <button className="btn-secondary" onClick={() => markRead(n.id)}>Mark read</button>}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="card text-center text-sage-600">No notifications yet.</p>}
      </div>
    </AppShell>
  );
}
