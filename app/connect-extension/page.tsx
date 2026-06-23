"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Copy, CheckCircle, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Token = {
  id: string;
  label: string;
  scopeZip: string;
  scopeCity: string;
  scopeState: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export default function ConnectExtensionPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [generating, setGenerating] = useState(false);
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");

  useEffect(() => {
    fetch("/api/extension/token", { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) {
          setAuthed(false);
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setAuthed(true);
        setTokens(data.tokens || []);
      })
      .catch(() => setAuthed(false));
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/extension/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          label: label.trim() || "My browser",
          scopeZip: zip.trim(),
          scopeCity: city.trim(),
          scopeState: stateCode.trim().toUpperCase(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to generate token");
      }
      const data = await res.json();
      setNewPlaintext(data.token);
      // Refresh list.
      const list = await fetch("/api/extension/token", { credentials: "include" });
      const listData = await list.json();
      setTokens(listData.tokens || []);
      setLabel("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const revoke = async (tokenId?: string) => {
    const ok = window.confirm(
      tokenId
        ? "Revoke this token? Any device using it will stop syncing."
        : "Revoke ALL your extension tokens? Any device using them will stop syncing."
    );
    if (!ok) return;
    await fetch("/api/extension/token", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(tokenId ? { tokenId } : {}),
    });
    const list = await fetch("/api/extension/token", { credentials: "include" });
    const listData = await list.json();
    setTokens(listData.tokens || []);
    toast.success("Token revoked.");
  };

  if (authed === false) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Sign in to connect</h1>
        <p className="mt-2 text-zinc-600">
          You need a GarageRoute account before connecting the browser extension.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login?next=/connect-extension"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Sign in
          </Link>
          <Link
            href="/signup?next=/connect-extension"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (authed === null) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center text-zinc-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900">Connect the browser extension</h1>
      <p className="mt-2 text-zinc-600">
        The GarageRoute Bridge extension reads yard-sale listings from Facebook Marketplace
        while you're logged in, and surfaces them into your GarageRoute account. Nothing
        is sent anywhere except garageroute.com.
      </p>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">Install the extension</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            Download <code>extensions/garageroute-bridge/</code> from this repo.
          </li>
          <li>
            Open <code>chrome://extensions</code>, enable Developer mode.
          </li>
          <li>
            Click "Load unpacked" and select the folder.
          </li>
          <li>Click the extension icon → "Manage connection" → paste your token below.</li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          (When ready, this extension ships through the Chrome Web Store under your developer account.)
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">Generate a connection token</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Device label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. MacBook Chrome"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">ZIP</label>
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="46268"
              maxLength={10}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Indianapolis"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">State</label>
            <input
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              placeholder="IN"
              maxLength={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {generating ? "Generating…" : "Generate token"}
        </button>

        {newPlaintext && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Token generated</span>
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              Copy this now — we only show it once.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="block w-full break-all rounded border border-emerald-300 bg-white p-2 font-mono text-xs text-zinc-800">
                {newPlaintext}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newPlaintext);
                  toast.success("Copied to clipboard");
                }}
                className="shrink-0 rounded-md bg-white p-2 text-zinc-700 hover:bg-emerald-100"
                aria-label="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Active connections</h2>
          {tokens.some((t) => !t.revokedAt && new Date(t.expiresAt) > new Date()) && (
            <button
              type="button"
              onClick={() => revoke()}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Revoke all
            </button>
          )}
        </div>

        {tokens.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No connections yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {tokens.map((t) => {
              const expired = new Date(t.expiresAt) < new Date();
              const revoked = !!t.revokedAt;
              return (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div className="text-sm">
                    <div className="font-medium text-zinc-900">
                      {t.label || "(unlabeled)"}
                      {revoked && (
                        <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          Revoked
                        </span>
                      )}
                      {!revoked && expired && (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {t.scopeCity || "—"}
                      {t.scopeState ? `, ${t.scopeState}` : ""} {t.scopeZip || ""} · created{" "}
                      {new Date(t.createdAt).toLocaleDateString()}
                      {t.lastUsedAt && ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  {!revoked && (
                    <button
                      type="button"
                      onClick={() => revoke(t.id)}
                      className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Revoke"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        <ExternalLink className="mr-1 inline h-3 w-3" />
        Read the{" "}
        <Link href="/docs/extension" className="text-blue-600 hover:underline">
          extension documentation
        </Link>{" "}
        for what this does and doesn't do.
      </p>
    </div>
  );
}