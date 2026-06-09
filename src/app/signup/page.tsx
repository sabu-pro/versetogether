"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const err = await signUp(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-sage-100">
          <BookOpen className="text-sage-700" size={38} />
        </div>
        <h1 className="text-4xl font-bold text-sage-900">Create account</h1>
        <p className="mt-2 text-sage-600">Sign up, then create or join your couple space.</p>
      </div>

      <form onSubmit={submit} className="card space-y-4">
        {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-sage-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-sage-800 underline">
          Login
        </Link>
      </p>
    </main>
  );
}
