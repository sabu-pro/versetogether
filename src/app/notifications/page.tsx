"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppNotification } from "@/types";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [existingVerseIds, setExistingVerseIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!profile) return;

    const { data } = await supabase
      .from("app_notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    setItems((data || []) as AppNotification[]);

    const verseIds = (data || [])
      .map((entry) => verseIdFromLink(entry.link))
      .filter((entry): entry is string => Boolean(entry));

    if (verseIds.length === 0) {
      setExistingVerseIds(new Set());
      return;
    }

    const uniqueIds = Array.from(new Set(verseIds));
    const { data: existingVerses } = await supabase
      .from("daily_verses")
      .select("id")
      .in("id", uniqueIds);

    setExistingVerseIds(new Set((existingVerses || []).map((entry) => entry.id)));
  }

  useEffect(() => {
    load();
  }, [profile?.id]);

  const verseIdFromLink = (link: string | null) => {
    if (!link) return null;
    const match = link.match(/\/reflection\/([^/?#]+)/i);
    return match ? match[1] : null;
  };

  const recentItems = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return items.filter((item) => new Date(item.created_at).getTime() >= cutoff);
  }, [items]);

  const sortedItems = useMemo(() => {
    return [...recentItems].sort((a, b) => {
      if (a.is_read !== b.is_read) return Number(a.is_read) - Number(b.is_read);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [recentItems]);

  const deletedVerseIds = useMemo(() => {
    const ids = new Set<string>();

    for (const item of sortedItems) {
      const verseId = verseIdFromLink(item.link);
      if (verseId && !existingVerseIds.has(verseId)) {
        ids.add(verseId);
      }
    }

    return ids;
  }, [existingVerseIds, sortedItems]);

  async function markRead(id: string) {
    await supabase.from("app_notifications").update({ is_read: true }).eq("id", id);
    await load();
  }

  async function markAllRead() {
    if (!profile) return;
    setBusy(true);
    await supabase.from("app_notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
    await load();
    setBusy(false);
  }

  async function clearReadAlerts() {
    if (!profile) return;
    const confirmed = window.confirm("Delete all read alerts?");
    if (!confirmed) return;

    setBusy(true);
    await supabase.from("app_notifications").delete().eq("user_id", profile.id).eq("is_read", true);
    await load();
    setBusy(false);
  }

  return (
    <AppShell>
      <Header title="Alerts" subtitle="Unread alerts first, with the latest 30 days shown by default." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-secondary" onClick={markAllRead} disabled={busy}>
          Mark all as read
        </button>
        <button type="button" className="btn btn-secondary" onClick={clearReadAlerts} disabled={busy}>
          Clear read alerts
        </button>
        <p className="text-sm text-sage-600">Showing the last 30 days of alerts.</p>
      </div>

      <div className="space-y-4">
        {sortedItems.map((n) => {
          const verseId = verseIdFromLink(n.link);
          const isDeletedVerse = Boolean(verseId && deletedVerseIds.has(verseId));

          return (
            <article key={n.id} className={`card ${!n.is_read ? "border-sage-400 bg-sage-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-sage-500">{format(new Date(n.created_at), "EEE, MMM d, yyyy • h:mm a")}</p>
                  <h2 className="mt-1 text-xl font-bold text-sage-900">{n.title}</h2>
                  <p className="mt-1 text-sage-700">{n.message}</p>
                  {isDeletedVerse && <p className="mt-2 text-sm text-rose-700">This verse was deleted.</p>}
                </div>
                {!n.is_read && <span className="badge-pill">Unread</span>}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {n.link && !isDeletedVerse ? (
                  <Link href={n.link} className="btn btn-primary">Open</Link>
                ) : (
                  <span className="rounded-full bg-rose-50 px-3 py-2 text-sm text-rose-700">This verse was deleted</span>
                )}
                {!n.is_read && (
                  <button type="button" className="btn btn-secondary" onClick={() => markRead(n.id)}>
                    Mark read
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {sortedItems.length === 0 && <p className="card text-center text-sage-600">No alerts in the last 30 days.</p>}
      </div>
    </AppShell>
  );
}
