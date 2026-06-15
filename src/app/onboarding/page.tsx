"use client";

import { BookOpen, Copy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import LoadingScreen from "@/components/LoadingScreen";
import { supabase } from "@/lib/supabase";

type Mode = "choose" | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, profileReady, refreshProfile } = useAuth();

  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profileReady) return;
    if (!user) router.replace("/login");
    if (profile?.couple_id) router.replace("/dashboard");
  }, [profileReady, user, profile, router]);

  async function createCouple(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setBusy(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("create_couple_with_profile", {
      p_name: name.trim(),
      p_email: user.email || "",
    });

    setBusy(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as { invite_code?: string };
    setGeneratedCode(result.invite_code || null);
    await refreshProfile();
  }

  async function joinCouple(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setBusy(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("join_couple_with_profile", {
      p_code: inviteInput.trim(),
      p_name: name.trim(),
      p_email: user.email || "",
    });

    setBusy(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    await refreshProfile();
    router.push("/dashboard");
  }

  async function copyCode() {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!profileReady) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  if (generatedCode) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="card text-center">
          <p className="badge-pill">Invite your partner</p>
          <h1 className="mt-3 text-2xl font-bold text-sage-900">Share this code</h1>
          <p className="mt-2 text-sage-600">
            Send this invite code to your partner. They sign up, then choose &ldquo;Join with invite code&rdquo; on onboarding.
          </p>
          <div className="mt-5 rounded-2xl bg-sage-50 px-4 py-5">
            <p className="text-3xl font-bold tracking-[0.2em] text-sage-900">{generatedCode}</p>
          </div>
          <button type="button" onClick={copyCode} className="btn btn-secondary mt-4 w-full">
            <Copy size={16} />
            {copied ? "Copied!" : "Copy invite code"}
          </button>
          <button type="button" onClick={() => router.push("/dashboard")} className="btn btn-primary mt-3 w-full">
            Continue to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-sage-100">
          <BookOpen className="text-sage-700" size={38} />
        </div>
        <h1 className="text-3xl font-bold text-sage-900">Welcome to VerseTogether</h1>
        <p className="mt-2 text-sage-600">Set up your private couple space.</p>
      </div>

      {mode === "choose" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMode("create")}
            className="card w-full text-left transition hover:border-rose-200"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sage-50 p-3">
                <BookOpen className="text-sage-700" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-sage-900">Start a new couple</h2>
                <p className="mt-1 text-sm text-sage-600">You&apos;ll get an invite code for your partner.</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("join")}
            className="card w-full text-left transition hover:border-rose-200"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-rose-50 p-3">
                <Users className="text-rose-700" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-sage-900">Join with invite code</h2>
                <p className="mt-1 text-sm text-sage-600">Your partner already created your couple space.</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={createCouple} className="card space-y-4">
          {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div>
            <label className="mb-1 block font-semibold">Your name</label>
            <input
              className="input"
              placeholder="Example: Sabut"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <p className="text-sm text-sage-600">
            You&apos;ll be partner 1 (Monday, Wednesday, Friday in week one).
          </p>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Creating..." : "Create couple space"}
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={() => setMode("choose")}>
            Back
          </button>
        </form>
      )}

      {mode === "join" && (
        <form onSubmit={joinCouple} className="card space-y-4">
          {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div>
            <label className="mb-1 block font-semibold">Invite code</label>
            <input
              className="input uppercase tracking-widest"
              placeholder="AB12CD34"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold">Your name</label>
            <input
              className="input"
              placeholder="Example: Sabita"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <p className="text-sm text-sage-600">
            You&apos;ll be partner 2 (Tuesday, Thursday in week one).
          </p>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Joining..." : "Join couple"}
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={() => setMode("choose")}>
            Back
          </button>
        </form>
      )}
    </main>
  );
}
