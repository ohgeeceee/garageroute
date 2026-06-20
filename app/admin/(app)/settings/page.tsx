"use client";

import { useState } from "react";
import { Save, ShieldCheck, KeyRound, Bell, Database, Globe, Mail, Loader2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">System</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Settings</h2>
        <p className="mt-1 text-sm text-surface-600">
          Platform configuration, integrations, and team access.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <SettingsCard title="General" description="Public-facing platform identity." icon={Globe}>
          <Field label="Platform name">
            <input className="input" defaultValue="GarageRoute" />
          </Field>
          <Field label="Contact email">
            <input className="input" type="email" defaultValue="hello@garageroute.com" />
          </Field>
          <Field label="Default region">
            <select className="input" defaultValue="us-east">
              <option value="us-east">US East (N. Virginia)</option>
              <option value="us-west">US West (Oregon)</option>
              <option value="eu">Europe (Frankfurt)</option>
            </select>
          </Field>
        </SettingsCard>

        <SettingsCard title="Admin access" description="Credentials are stored in environment variables." icon={KeyRound}>
          <div className="rounded-md border border-warning-100 bg-warning-50 p-3 text-sm text-warning-700">
            <ShieldCheck className="inline h-4 w-4 mr-1" />
            Admin access is gated by <code className="font-mono text-xs">ADMIN_USERNAME</code> and{" "}
            <code className="font-mono text-xs">ADMIN_PASSWORD</code> in <code className="font-mono text-xs">.env</code>.
          </div>
          <Field label="Session timeout">
            <select className="input" defaultValue="7">
              <option value="1">1 hour</option>
              <option value="24">24 hours</option>
              <option value="168">7 days (current)</option>
              <option value="720">30 days</option>
            </select>
          </Field>
        </SettingsCard>

        <SettingsCard title="Notifications" description="What admins get pinged about." icon={Bell}>
          {[
            { label: "New sale submission", def: true },
            { label: "Verification request", def: true },
            { label: "New message to seller", def: false },
            { label: "Failed geocoding", def: true },
            { label: "Daily summary digest", def: true },
          ].map((row) => (
            <label key={row.label} className="flex items-center justify-between gap-4 rounded-md border border-surface-200 px-3 py-2 cursor-pointer hover:bg-surface-50">
              <span className="text-sm font-medium text-surface-800">{row.label}</span>
              <input
                type="checkbox"
                defaultChecked={row.def}
                className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
          ))}
        </SettingsCard>

        <SettingsCard title="Integrations" description="Third-party services." icon={Database}>
          <Integration name="Stripe" status="mock" note="Set STRIPE_SECRET_KEY to enable live payments." />
          <Integration name="OpenStreetMap" status="connected" note="Used for geocoding and routing." />
          <Integration name="Leaflet" status="connected" note="Map renderer." />
          <Integration name="Resend (email)" status="not_configured" note="Add RESEND_API_KEY for alert emails." />
        </SettingsCard>

        <div className="flex items-center justify-between rounded-md border border-surface-200 bg-surface-0 p-3">
          <p className="text-xs text-surface-500">
            {savedAt ? <span className="font-semibold text-success-700">Saved at {savedAt}.</span> : "Changes are not persisted in this prototype."}
          </p>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-surface-900">{title}</h3>
          <p className="text-sm text-surface-600">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function Integration({
  name,
  status,
  note,
}: {
  name: string;
  status: "connected" | "mock" | "not_configured";
  note: string;
}) {
  const config = {
    connected:      { badge: "badge-success", label: "Connected" },
    mock:           { badge: "badge-warning", label: "Mock mode" },
    not_configured: { badge: "badge-neutral", label: "Not configured" },
  }[status];
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-surface-200 px-3 py-2">
      <div>
        <p className="text-sm font-semibold text-surface-900">{name}</p>
        <p className="text-xs text-surface-500">{note}</p>
      </div>
      <span className={`badge ${config.badge}`}>{config.label}</span>
    </div>
  );
}
