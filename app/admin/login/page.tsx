"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, ShieldCheck, LayoutDashboard } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-surface-50">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between bg-surface-900 p-12 text-surface-50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="font-bold tracking-tight">GarageRoute</p>
            <p className="text-xs uppercase tracking-wider text-surface-400">Admin Console</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Trusted operator access
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Manage listings, trust, and growth — all in one place.
          </h1>
          <p className="max-w-md text-surface-300">
            Review pending verifications, monitor platform metrics, message sellers, and keep the marketplace healthy.
          </p>
        </div>

        <p className="text-xs text-surface-500">
          © 2026 GarageRoute · v0.1 prototype
        </p>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="eyebrow">Sign in</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-surface-600">
              Enter your admin credentials to continue.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="username" className="field-label">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="input"
              />
            </div>

            {error && (
              <p className="rounded-md border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign in to admin
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-surface-500">
            Protected resource · All actions are logged
          </p>
        </div>
      </div>
    </div>
  );
}
