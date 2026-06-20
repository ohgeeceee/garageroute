"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2, KeyRound, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="card p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-warning-600" />
          <h1 className="mt-4 text-xl font-bold text-surface-900">Invalid reset link</h1>
          <p className="mt-2 text-sm text-surface-600">That link is missing or malformed.</p>
          <Link href="/forgot-password" className="btn btn-primary mt-6 w-full">
            Request a new link
          </Link>
        </div>
      </main>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reset failed.");
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="card p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-surface-900">Choose a new password</h1>
        </div>

        {done ? (
          <div className="rounded-md border border-success-200 bg-success-50 p-4 text-sm text-success-700">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Password updated.
            </p>
            <p className="mt-1 text-success-800">Redirecting to sign in…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-600">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                New password
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
              <span className="mt-1 block text-xs text-surface-500">At least 8 characters.</span>
            </label>
            {error && (
              <p role="alert" className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Set new password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
