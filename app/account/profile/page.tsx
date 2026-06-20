"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Lock, User as UserIcon, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";

type Me = {
  id: string;
  email: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  verifiedSeller: boolean;
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((d: { user: Me | null }) => {
        setMe(d.user);
        setLoading(false);
      });
  }, []);

  if (loading || !me) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-surface-400" /></div>;
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setToast(null);
    try {
      const form = e.target as HTMLFormElement;
      const data = Object.fromEntries(new FormData(form).entries());
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Save failed.");
      setMe({ ...me, ...j.user });
      setToast({ kind: "ok", msg: "Profile saved." });
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setSavingProfile(false);
      setTimeout(() => setToast(null), 2000);
    }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    setToast(null);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: pwCurrent, next: pwNext }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Change failed.");
      setToast({ kind: "ok", msg: "Password updated. Other sessions signed out." });
      setPwCurrent("");
      setPwNext("");
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setSavingPw(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Profile &amp; security</h1>
        <p className="mt-1 text-sm text-surface-600">Update your public details and password.</p>
      </header>

      {/* Profile form */}
      <form onSubmit={saveProfile} className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-surface-900">
          <UserIcon className="h-4 w-4 text-surface-400" /> Public profile
        </h2>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">Email</label>
          <input value={me.email} disabled className="input bg-surface-50 text-surface-500" />
          <p className="mt-1 text-xs text-surface-500">Email changes are not supported yet. Contact support.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">Name</label>
          <input name="name" defaultValue={me.name} required minLength={2} maxLength={80} className="input" />
        </div>
        <fieldset>
          <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-600">
            <MapPin className="h-3.5 w-3.5" /> Default location
          </legend>
          <p className="mb-2 text-xs text-surface-500">Pre-fills new sales. Buyers won&apos;t see this until you post.</p>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <input name="city" defaultValue={me.city} placeholder="City" maxLength={80} className="input" />
            <input name="state" defaultValue={me.state} placeholder="ST" maxLength={4} className="input" />
            <input name="zip" defaultValue={me.zip} placeholder="ZIP" maxLength={12} className="input" />
          </div>
        </fieldset>
        <div className="flex items-center justify-end">
          <button type="submit" disabled={savingProfile} className="btn btn-primary">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </button>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={changePw} className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-surface-900">
          <Lock className="h-4 w-4 text-surface-400" /> Change password
        </h2>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">Current password</label>
          <input type="password" required autoComplete="current-password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">New password</label>
          <input type="password" required minLength={8} autoComplete="new-password" value={pwNext} onChange={(e) => setPwNext(e.target.value)} className="input" />
          <p className="mt-1 text-xs text-surface-500">At least 8 characters.</p>
        </div>
        <div className="flex items-center justify-end">
          <button type="submit" disabled={savingPw || !pwCurrent || !pwNext} className="btn btn-primary">
            {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Update password
          </button>
        </div>
      </form>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg animate-fade-in ${
            toast.kind === "ok" ? "border-success-200 bg-success-50 text-success-700" : "border-error-200 bg-error-50 text-error-700"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <p className="text-sm font-semibold">{toast.msg}</p>
        </div>
      )}
    </div>
  );
}
