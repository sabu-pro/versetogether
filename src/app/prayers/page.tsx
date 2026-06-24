"use client";

import { Heart, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PrayerRequest, ThoughtTestimony } from "@/types";
import { prettyDate } from "@/lib/utils";

type ThoughtReaction = {
  id: string;
  thought_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
};

export default function PrayersPage() {
  const { profile, couple } = useAuth();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [thoughts, setThoughts] = useState<ThoughtTestimony[]>([]);
  const [reactions, setReactions] = useState<ThoughtReaction[]>([]);
  const [text, setText] = useState("");
  const [thoughtText, setThoughtText] = useState("");
  const [showThoughtForm, setShowThoughtForm] = useState(false);
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [editingThoughtText, setEditingThoughtText] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [{ data: prayerData }, { data: thoughtData }, { data: reactionData }] =
      await Promise.all([
        supabase
          .from("prayer_requests")
          .select("*, profile:profiles(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("thoughts_testimonies")
          .select("*, profile:profiles(*)")
          .order("created_at", { ascending: false }),
        supabase.from("thought_reactions").select("*"),
      ]);

    setPrayers((prayerData || []) as PrayerRequest[]);
    setThoughts((thoughtData || []) as ThoughtTestimony[]);
    setReactions((reactionData || []) as ThoughtReaction[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function addPrayer(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !couple) return;

    await supabase.from("prayer_requests").insert({
      couple_id: couple.id,
      user_id: profile.id,
      request_text: text,
    });

    setText("");
    load();
  }

  async function markAnswered(id: string) {
    await supabase
      .from("prayer_requests")
      .update({ is_answered: true, answered_at: new Date().toISOString() })
      .eq("id", id);

    load();
  }

  async function addThought(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !couple) return;

    setError("");

    const { error: insertError } = await supabase.from("thoughts_testimonies").insert({
      couple_id: couple.id,
      user_id: profile.id,
      content: thoughtText.trim(),
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setThoughtText("");
    setShowThoughtForm(false);
    load();
  }

  function startEditThought(thought: ThoughtTestimony) {
    setEditingThoughtId(thought.id);
    setEditingThoughtText(thought.content);
  }

  async function saveThoughtEdit(thoughtId: string) {
    if (!profile) return;

    setError("");

    const { error: updateError } = await supabase
      .from("thoughts_testimonies")
      .update({
        content: editingThoughtText.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", thoughtId)
      .eq("user_id", profile.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingThoughtId(null);
    setEditingThoughtText("");
    load();
  }

  async function deleteThought(thoughtId: string) {
    if (!profile) return;

    const confirmed = window.confirm("Delete this thought or testimony?");
    if (!confirmed) return;

    setError("");

    const { error: deleteError } = await supabase
      .from("thoughts_testimonies")
      .delete()
      .eq("id", thoughtId)
      .eq("user_id", profile.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    load();
  }

  async function toggleThoughtLove(thoughtId: string) {
    if (!profile) return;

    const existing = reactions.find(
      (reaction) => reaction.thought_id === thoughtId && reaction.user_id === profile.id
    );

    setError("");

    if (existing) {
      const { error: deleteError } = await supabase
        .from("thought_reactions")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("thought_reactions").insert({
        thought_id: thoughtId,
        user_id: profile.id,
        reaction: "love",
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    load();
  }

  return (
    <AppShell>
      <Header title="Prayer Requests" subtitle="Pray together and remember answered prayers." />

      <form onSubmit={addPrayer} className="card mb-5 space-y-3">
        <textarea
          className="textarea min-h-24"
          placeholder="Add a prayer request..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <button className="btn btn-primary w-full">Add Prayer</button>
      </form>

      <section className="card mb-5">
        <p className="badge-pill">Thoughts & Testimonies</p>
        <h2 className="mt-2 text-xl font-bold text-sage-900">Share encouragement</h2>
        <p className="mt-1 text-sm text-sage-600">
          Add a short thought, testimony, or spiritual note for your partner.
        </p>

        {!showThoughtForm ? (
          <button
            type="button"
            className="btn btn-secondary mt-4 w-full"
            onClick={() => setShowThoughtForm(true)}
          >
            Share Thought or Testimony
          </button>
        ) : (
          <form onSubmit={addThought} className="mt-4 space-y-3">
            <textarea
              className="textarea min-h-24"
              placeholder="Write a thought, testimony, or encouragement..."
              value={thoughtText}
              onChange={(e) => setThoughtText(e.target.value)}
              required
            />
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary flex-1">
                Share
              </button>
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => {
                  setShowThoughtForm(false);
                  setThoughtText("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {error && <p className="card mb-5 bg-rose-50 text-rose-700">{error}</p>}

      {thoughts.length > 0 && (
        <div className="mb-5 space-y-4">
          {thoughts.map((thought) => {
            const isAuthor = profile?.id === thought.user_id;
            const isEditing = editingThoughtId === thought.id;
            const lovedByMe = reactions.some(
              (reaction) => reaction.thought_id === thought.id && reaction.user_id === profile?.id
            );
            const loveCount = reactions.filter(
              (reaction) => reaction.thought_id === thought.id
            ).length;

            return (
              <article key={thought.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-sage-500">
                      {thought.profile?.name} • {prettyDate(thought.created_at)}
                    </p>

                    {isEditing ? (
                      <div className="mt-3 space-y-3">
                        <textarea
                          className="textarea min-h-24"
                          value={editingThoughtText}
                          onChange={(e) => setEditingThoughtText(e.target.value)}
                          required
                        />
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className="btn btn-primary flex-1"
                            onClick={() => saveThoughtEdit(thought.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary flex-1"
                            onClick={() => {
                              setEditingThoughtId(null);
                              setEditingThoughtText("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 whitespace-pre-line text-sage-700">
                          {thought.content}
                        </p>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleThoughtLove(thought.id)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                              lovedByMe
                                ? "border-pink-300 bg-pink-100 text-[#111111]"
                                : "border-pink-200 bg-white text-[#111111] hover:bg-pink-50"
                            }`}
                          >
                            <Heart size={16} fill={lovedByMe ? "currentColor" : "none"} />
                            {lovedByMe ? "Loved" : "Love"}
                          </button>

                          {loveCount > 0 && (
                            <span className="text-sm text-sage-500">
                              {loveCount} {loveCount === 1 ? "love" : "loves"}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {isAuthor && !isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditThought(thought)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-white/90 text-[#111111] shadow-sm transition hover:bg-[#fff1f6]"
                        aria-label="Edit thought"
                        title="Edit thought"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteThought(thought.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-white/90 text-[#111111] shadow-sm transition hover:bg-[#fff1f6]"
                        aria-label="Delete thought"
                        title="Delete thought"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        {prayers.map((p) => (
          <div key={p.id} className={`card ${p.is_answered ? "bg-sage-50" : ""}`}>
            <p className="text-sm text-sage-500">
              {p.profile?.name} • {prettyDate(p.created_at)}
            </p>
            <p className={`mt-2 ${p.is_answered ? "line-through text-sage-500" : ""}`}>
              {p.request_text}
            </p>
            {p.is_answered ? (
              <p className="mt-3 text-sm font-semibold text-sage-700">
                Answered {p.answered_at ? prettyDate(p.answered_at) : ""}
              </p>
            ) : (
              <button onClick={() => markAnswered(p.id)} className="btn btn-secondary mt-4">
                Mark Answered
              </button>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}