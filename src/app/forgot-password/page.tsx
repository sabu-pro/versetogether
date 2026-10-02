"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [codeStep, setCodeStep] = useState(false);
  const [verified, setVerified] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!resendAt) return;
    const tick = () => setCooldown(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  async function sendCode() {
    if (busy || Date.now() < resendAt) return;
    setBusy(true);
    setError("");
    setToken("");
    try {
      await supabase.auth.resetPasswordForEmail(email.trim());
    } catch {
      // Keep the response identical regardless of account existence.
    } finally {
      setCodeStep(true);
      setCooldown(60);
      setResendAt(Date.now() + 60000);
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!codeStep) {
      await sendCode();
      return;
    }
    setError("");
    if (!updated && (password.length < 8 || password !== confirmation)) {
      setError(password.length < 8 ? "Use at least 8 characters." : "Passwords must match.");
      return;
    }
    if (!verified && !/^\d{6}$/.test(token)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      if (!verified) {
        const { error: verificationError } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "recovery" });
        if (verificationError) {
          setError("That code is invalid or expired. Check the code or request a new one.");
          return;
        }
        setVerified(true);
      }
      if (!updated) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
          return;
        }
        setUpdated(true);
        setPassword("");
        setConfirmation("");
      }
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError("Your password was updated, but signing out failed. Please try again.");
        return;
      }
      router.replace("/login?passwordReset=success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-sage-100">
          <BookOpen className="text-sage-700" size={38} />
        </div>
        <h1 className="text-4xl font-bold text-sage-900">Reset password</h1>
        <p className="mt-2 text-sage-600">{codeStep ? "Enter your email code and choose a new password." : "Enter your email to receive a reset code."}</p>
      </div>

      <form onSubmit={submit} onChange={() => setError("")} className="card space-y-4">
        {codeStep && <p role="status" className="rounded-2xl bg-sage-100 p-3 text-sm text-sage-800">If that email exists, we sent a code</p>}
        {error && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <input className="input" aria-label="Email" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy || verified} required />
        {codeStep && !updated && <>
          <input className="input" aria-label="6-digit code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit code" value={token} onChange={(e) => setToken(e.target.value)} disabled={busy || verified} required />
          <input className="input" aria-label="New password" type="password" autoComplete="new-password" placeholder="New password (min 8 characters)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} required />
          <input className="input" aria-label="Confirm new password" type="password" autoComplete="new-password" placeholder="Confirm new password" minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={busy} required />
        </>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Please wait..." : updated ? "Sign out and return to login" : codeStep ? "Reset password" : "Send code"}
        </button>
        {codeStep && !verified && <button type="button" className="w-full text-sm font-semibold text-sage-800 underline disabled:opacity-50" disabled={busy || cooldown > 0} onClick={(e) => {
          const emailInput = e.currentTarget.form?.querySelector<HTMLInputElement>('input[type="email"]');
          if (emailInput?.reportValidity()) void sendCode();
        }}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>}
      </form>

      <p className="mt-6 text-center text-sm text-sage-600">
        <Link href="/login" className="font-semibold text-sage-800 underline">Back to login</Link>
      </p>
    </main>
  );
}
