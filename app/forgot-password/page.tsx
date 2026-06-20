"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, KeyRound, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="card p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-surface-900">Reset your password</h1>
          <p className="mt-1 text-sm text-surface-600">
            We&apos;ll email you a link to choose a new password.
          </p>
        </div>

        {sent ? (
          <div className="rounded-md border border-success-200 bg-success-50 p-4 text-sm text-success-700">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Check your inbox.
            </p>
            <p className="mt-1 text-success-800">
              If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-600">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-surface-600">
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
