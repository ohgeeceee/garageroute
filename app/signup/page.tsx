"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, UserPlus, Mail, Lock, User as UserIcon } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sign-up failed.");
      router.replace("/account");
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
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-surface-900">Create your account</h1>
          <p className="mt-1 text-sm text-surface-600">
            Sign up to manage sales, message buyers, and track your listings.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" icon={UserIcon}>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="input"
            />
          </Field>
          <Field label="Email" icon={Mail}>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
            />
          </Field>
          <Field label="Password" icon={Lock} hint="At least 8 characters.">
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  icon: React.ElementType;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-600">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-surface-500">{hint}</span>}
    </label>
  );
}
