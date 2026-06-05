"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { weekStartString } from "@/lib/utils";
import { WeeklyGoal } from "@/types";

export default function GoalsPage() {
  const { profile } = useAuth();
  const [goal, setGoal] = useState<WeeklyGoal | null>(null);
  const [goalText, setGoalText] = useState("");

  async function load() {
    const { data } = await supabase
      .from("weekly_goals")
      .select("*, profile:profiles(*)")
      .eq("week_start", weekStartString())
      .maybeSingle();
    setGoal(data as WeeklyGoal | null);
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    await supabase.from("weekly_goals").insert({
      week_start: weekStartString(),
      goal_text: goalText,
      created_by: profile.id
    });
    setGoalText("");
    load();
  }

  async function toggle() {
    if (!goal) return;
    await supabase.from("weekly_goals").update({ completed: !goal.completed }).eq("id", goal.id);
    load();
  }

  return (
    <AppShell>
      <Header title="Weekly Goal" subtitle="Choose one simple spiritual activity for this week." />

      {goal ? (
        <section className="card">
          <p className="text-sm text-sage-500">This week’s goal</p>
          <h2 className="mt-2 text-2xl font-bold">{goal.goal_text}</h2>
          <button onClick={toggle} className="btn btn-primary mt-5 w-full">
            {goal.completed ? "Completed ✓" : "Mark as Completed"}
          </button>
        </section>
      ) : (
        <form onSubmit={save} className="card space-y-4">
          <textarea className="textarea min-h-28" placeholder="Example: Memorise one verse this week" value={goalText} onChange={(e) => setGoalText(e.target.value)} required />
          <button className="btn btn-primary w-full">Set Weekly Goal</button>
        </form>
      )}

      <section className="card mt-5">
        <h2 className="text-xl font-bold">Goal ideas</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sage-700">
          <li>Memorise one verse</li>
          <li>Pray together three times</li>
          <li>Read one chapter from Proverbs</li>
          <li>Share one testimony</li>
        </ul>
      </section>
    </AppShell>
  );
}
