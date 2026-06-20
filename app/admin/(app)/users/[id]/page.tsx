"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  ShieldOff,
  PauseCircle,
  PlayCircle,
  Trash2,
  KeyRound,
  Save,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type UserDetail = {
  id: string;
  email: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  verifiedSeller: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: { sessions: number; sales: number; verifications: number; passwordResets: number };
  sales: { id: string; title: string; verified: boolean; createdAt: string }[];
  verifications: { id: string; status: string; notes: string; submittedAt: string; reviewedAt: string | null }[];
  sessions: { id: string; ip: string; userAgent: string; createdAt: string; expiresAt: string }[];
};

export default function AdminUserDetailPage({ userId }: { userId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [tempPw, setTempPw] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.status === 404) { router.replace("/admin/users"); return; }
      const data = await res.json();
      setUser(data);
      setName(data.name);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => { load(); }, [load]);

  const patch = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Update failed.");
      setToast({ kind: "ok", msg: success });
      await load();
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const resetPw = async () => {
    if (tempPw.length < 8) {
      setToast({ kind: "err", msg: "Password must be at least 8 characters." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: tempPw }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Reset failed.");
      setToast({ kind: "ok", msg: "Password set. All sessions signed out." });
      setTempPw("");
      setShowReset(false);
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!user) return;
    if (!confirm(`Delete ${user.email}? Soft delete keeps the record, hard delete is permanent.`)) return;
    const hard = confirm("HARD delete (cannot undo)? Click Cancel for soft delete.");
    setBusy(true);
    try {
      const url = `/api/admin/users/${userId}${hard ? "?hard=1" : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Delete failed.");
      setToast({ kind: "ok", msg: hard ? "User permanently deleted." : "User deactivated." });
      setTimeout(() => router.replace("/admin/users"), 800);
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
      setBusy(false);
    }
  };

  if (loading || !user) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-surface-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-surface-600 hover:text-surface-900">
        <ArrowLeft className="h-4 w-4" /> Users
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-surface-900">{user.name}</h1>
            <p className="text-sm text-surface-600">{user.email}</p>
            <p className="mt-0.5 text-xs text-surface-500">
              Joined {new Date(user.createdAt).toLocaleString()} · ID {user.id.slice(0, 8)}…
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => patch({ verifiedSeller: !user.verifiedSeller }, user.verifiedSeller ? "Verification removed." : "Marked as verified seller.")}
            disabled={busy}
            className={user.verifiedSeller ? "btn btn-secondary" : "btn btn-primary"}
          >
            {user.verifiedSeller ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {user.verifiedSeller ? "Unverify seller" : "Verify seller"}
          </button>
          <button
            onClick={() => patch({ status: user.status === "suspended" ? "active" : "suspended" }, user.status === "suspended" ? "Reactivated." : "Suspended.")}
            disabled={busy}
            className="btn btn-secondary"
          >
            {user.status === "suspended" ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
            {user.status === "suspended" ? "Reactivate" : "Suspend"}
          </button>
          <button onClick={() => setShowReset((s) => !s)} disabled={busy} className="btn btn-secondary">
            <KeyRound className="h-4 w-4" /> Reset password
          </button>
          <button onClick={remove} disabled={busy} className="btn btn-secondary text-error-700">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Edit name */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-surface-900">Profile</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              patch({ name }, "Name updated.");
            }}
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} className="input" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">City</label>
                <input value={user.city} disabled className="input bg-surface-50" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">State</label>
                <input value={user.state} disabled className="input bg-surface-50" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">ZIP</label>
                <input value={user.zip} disabled className="input bg-surface-50" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button type="submit" disabled={busy || name === user.name} className="btn btn-primary">
                <Save className="h-4 w-4" /> Save name
              </button>
            </div>
          </form>

          {showReset && (
            <div className="mt-5 border-t border-surface-200 pt-5">
              <h3 className="text-sm font-semibold text-surface-900">Set temporary password</h3>
              <p className="mt-1 text-xs text-surface-500">
                The user will be signed out of all devices and will need to log in with this password.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={tempPw}
                  onChange={(e) => setTempPw(e.target.value)}
                  placeholder="At least 8 characters"
                  className="input flex-1 min-w-[200px]"
                  autoComplete="off"
                />
                <button onClick={resetPw} disabled={busy || tempPw.length < 8} className="btn btn-danger">
                  Set password
                </button>
                <button onClick={() => { setShowReset(false); setTempPw(""); }} className="btn btn-secondary">Cancel</button>
              </div>
            </div>
          )}
        </section>

        {/* Stats */}
        <aside className="space-y-3">
          <Stat label="Status" value={user.status} />
          <Stat label="Role" value={user.role} />
          <Stat label="Sales" value={String(user._count.sales)} />
          <Stat label="Active sessions" value={String(user._count.sessions)} />
          <Stat label="Verification submissions" value={String(user._count.verifications)} />
        </aside>
      </div>

      {/* Sales */}
      <section className="card overflow-hidden">
        <header className="border-b border-surface-200 px-5 py-3">
          <h2 className="text-base font-semibold text-surface-900">Sales ({user.sales.length})</h2>
        </header>
        {user.sales.length === 0 ? (
          <p className="px-5 py-6 text-sm text-surface-500">No sales yet.</p>
        ) : (
          <ul className="divide-y divide-surface-200">
            {user.sales.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <Link href={`/admin/sales/${s.id}`} className="text-sm font-semibold text-surface-900 hover:text-brand-700">{s.title}</Link>
                <div className="flex items-center gap-3">
                  {s.verified ? <span className="badge badge-success"><CheckCircle2 className="h-3 w-3" /> Verified</span> : null}
                  <span className="text-xs text-surface-500">{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Verifications */}
      {user.verifications.length > 0 && (
        <section className="card overflow-hidden">
          <header className="border-b border-surface-200 px-5 py-3">
            <h2 className="text-base font-semibold text-surface-900">Verification history</h2>
          </header>
          <ul className="divide-y divide-surface-200">
            {user.verifications.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-surface-800">{v.notes || <em className="text-surface-400">No notes</em>}</p>
                  <p className="mt-0.5 text-xs text-surface-500">
                    Submitted {new Date(v.submittedAt).toLocaleString()}
                    {v.reviewedAt && ` · reviewed ${new Date(v.reviewedAt).toLocaleString()}`}
                  </p>
                </div>
                <span className="shrink-0">
                  {v.status === "approved" && <span className="badge badge-success"><CheckCircle2 className="h-3 w-3" /> Approved</span>}
                  {v.status === "rejected" && <span className="badge badge-error"><XCircle className="h-3 w-3" /> Rejected</span>}
                  {v.status === "pending"  && <span className="badge badge-info">Pending</span>}
                  {v.status === "superseded" && <span className="badge badge-neutral">Superseded</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold capitalize text-surface-900">{value}</p>
    </div>
  );
}
