"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2, LogIn, Mail, Lock } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sign-in failed.");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="card p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
            <LogIn className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-surface-900">Welcome back</h1>
          <p className="mt-1 text-sm text-surface-600">Sign in to manage your sales.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-600">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-600">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-semibold text-brand-700 hover:underline">
            Forgot password?
          </Link>
          <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
