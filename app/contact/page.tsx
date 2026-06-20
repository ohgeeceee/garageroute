"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Send,
  Loader2,
  MessageSquare,
  Briefcase,
  LifeBuoy,
} from "lucide-react";

type Topic = "support" | "partnerships" | "press" | "sales" | "other";

const topics: { id: Topic; label: string; icon: React.ElementType; desc: string }[] = [
  {
    id: "support",
    label: "Buyer / seller support",
    icon: LifeBuoy,
    desc: "Help with a sale, a message, or a reservation.",
  },
  {
    id: "partnerships",
    label: "Partnerships",
    icon: Briefcase,
    desc: "Charities, marketplaces, or local press collaborations.",
  },
  {
    id: "press",
    label: "Press inquiry",
    icon: MessageSquare,
    desc: "Interviews, statements, or fact-checking.",
  },
  {
    id: "sales",
    label: "Talk to sales (B2B)",
    icon: Building2,
    desc: "Bulk listings, HOA coordination, or custom needs.",
  },
];

export default function ContactPage() {
  const [topic, setTopic] = useState<Topic>("support");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulated submission — wire to /api/contact when that endpoint exists.
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setSent(true);
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="bg-surface-50">
      {/* ============= HERO ============= */}
      <section className="relative overflow-hidden bg-surface-900 text-surface-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.30),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_45%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Contact
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              We&apos;re here to help —{" "}
              <span className="text-gradient">usually within hours.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-surface-300">
              Pick a topic below and we&apos;ll route you to the right person.
              Most messages get a real, human reply within one business day.
            </p>
          </div>
        </div>
      </section>

      {/* ============= CONTACT OPTIONS + FORM ============= */}
      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          {/* Sidebar with topics + direct contacts */}
          <aside className="lg:col-span-4">
            <p className="eyebrow">Choose a topic</p>
            <div className="mt-3 space-y-2">
              {topics.map((t) => {
                const Icon = t.icon;
                const active = topic === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTopic(t.id)}
                    aria-pressed={active}
                    className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${
                      active
                        ? "border-brand-300 bg-brand-50"
                        : "border-surface-200 bg-surface-0 hover:border-surface-300"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? "bg-brand-600 text-white"
                          : "bg-surface-100 text-surface-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold ${
                          active ? "text-brand-800" : "text-surface-900"
                        }`}
                      >
                        {t.label}
                      </p>
                      <p className="mt-0.5 text-xs text-surface-600">
                        {t.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-2">
              <DirectContact
                icon={Mail}
                label="General"
                value="hello@garageroute.com"
              />
              <DirectContact
                icon={ShieldCheck}
                label="Trust &amp; safety"
                value="trust@garageroute.com"
              />
              <DirectContact
                icon={Phone}
                label="Press hotline"
                value="press@garageroute.com"
              />
            </div>
          </aside>

          {/* Form */}
          <div className="lg:col-span-8">
            <div className="card p-6 sm:p-10">
              {sent ? (
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-700">
                    <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-surface-900">
                    Message received.
                  </h2>
                  <p className="mt-2 text-surface-600">
                    We&apos;ll get back to you within one business day. If
                    it&apos;s urgent,{" "}
                    <a
                      href="mailto:hello@garageroute.com"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      email us directly
                    </a>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="btn btn-secondary btn-sm mt-6"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-surface-900">
                      Send us a message
                    </h2>
                    <p className="mt-1 text-sm text-surface-600">
                      Selected topic:{" "}
                      <span className="font-semibold text-surface-800">
                        {topics.find((t) => t.id === topic)?.label}
                      </span>
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-name" className="field-label">
                        Your name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        className="input"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="field-label">
                        Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="field-label">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={6}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what you need. Links help."
                      className="input"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-surface-500">
                      We&apos;ll never share your message with anyone outside
                      GarageRoute.
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden="true" />
                      )}
                      Send message
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DirectContact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <a
      href={`mailto:${value.replace("&amp;", "@")}`}
      className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-0 p-3 transition hover:border-brand-300 hover:bg-brand-50"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-100 text-surface-700">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-xs font-semibold uppercase tracking-wider text-surface-500"
          dangerouslySetInnerHTML={{ __html: label }}
        />
        <p className="truncate text-sm font-medium text-surface-900">
          {value.replace("&amp;", "@")}
        </p>
      </div>
    </a>
  );
}
