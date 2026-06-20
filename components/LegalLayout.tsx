import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface LegalSection {
  id?: string;
  heading: string;
  body: React.ReactNode;
}

export interface LegalLayoutProps {
  title: string;
  intro: string;
  lastUpdated: string;
  toc?: { id: string; label: string }[];
  sections: LegalSection[];
  contactEmail?: string;
}

export default function LegalLayout({
  title,
  intro,
  lastUpdated,
  toc,
  sections,
  contactEmail = "admin@garageroute.com",
}: LegalLayoutProps) {
  return (
    <div className="bg-surface-50">
      {/* ============= HEADER ============= */}
      <section className="border-b border-surface-200 bg-surface-0">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-xs font-medium text-surface-500">
              <li>
                <Link href="/" className="hover:text-surface-700">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-surface-700">
                  Legal
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li className="text-surface-700">{title}</li>
            </ol>
          </nav>

          <span className="eyebrow">Legal</span>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-surface-900 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-surface-600">
            {intro}
          </p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-surface-500">
            Last updated · {lastUpdated}
          </p>
        </div>
      </section>

      {/* ============= BODY ============= */}
      <section className="py-14">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          {/* TOC — desktop sticky */}
          {toc && toc.length > 0 && (
            <aside className="lg:col-span-3">
              <div className="sticky top-24 hidden lg:block">
                <p className="eyebrow">On this page</p>
                <ul className="mt-3 space-y-1.5 border-l border-surface-200 pl-3">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`#${item.id}`}
                        className="block py-1 text-sm font-medium text-surface-600 transition hover:text-brand-700"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}

          {/* Content */}
          <article className="lg:col-span-9">
            <div className="card p-6 sm:p-10">
              <div className="prose-legal space-y-8 text-sm leading-relaxed text-surface-700">
                {sections.map((s, idx) => (
                  <section
                    key={s.heading}
                    id={s.id || `section-${idx}`}
                    className="scroll-mt-24"
                  >
                    <h2 className="font-display text-xl font-bold tracking-tight text-surface-900">
                      {s.heading}
                    </h2>
                    <div className="mt-3 space-y-3">{s.body}</div>
                  </section>
                ))}
              </div>

              <div className="mt-10 rounded-lg border border-surface-200 bg-surface-50 p-5">
                <p className="text-sm text-surface-700">
                  Questions about this document?{" "}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {contactEmail}
                  </a>
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
