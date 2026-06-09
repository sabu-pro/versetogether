"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const err = await signIn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("couple_id")
      .eq("id", user.id)
      .maybeSingle();

    router.push(profile?.couple_id ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-sage-100">
          <BookOpen className="text-sage-700" size={38} />
        </div>
        <h1 className="text-4xl font-bold text-sage-900">VerseTogether</h1>
        <p className="mt-2 text-sage-600">Share God’s Word.Pray together.Grow together.</p>
      </div>

      <form onSubmit={submit} className="card space-y-4">
        {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-sage-600">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-sage-800 underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
