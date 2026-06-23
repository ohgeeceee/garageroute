import Link from "next/link";
import {
  MapPin,
  Globe,
  Mail,
  Briefcase,
  Shield,
  Sparkles,
} from "lucide-react";

const product = [
  { href: "/sales", label: "Browse sales" },
  { href: "/routes", label: "Themed routes" },
  { href: "/states", label: "States" },
  { href: "/post", label: "Post a sale" },
  { href: "/blog", label: "Blog" },
  { href: "/manage/demo", label: "Seller dashboard" },
];

const company = [
  { href: "/about", label: "About" },
  { href: "/careers", label: "Careers" },
  { href: "/press", label: "Press" },
  { href: "/contact", label: "Contact" },
];

const trust = [
  { href: "/security", label: "Security" },
  { href: "/status", label: "System status" },
];

const legal = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/cookies", label: "Cookies" },
];

export default function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-surface-0">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand block */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2 text-brand-700">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-brand">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold tracking-tight text-surface-900">
                GarageRoute
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-surface-600">
              The operating system for local weekend commerce — discover sales,
              preview inventory, and build the smartest route in town.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <SocialLink href="mailto:admin@garageroute.com" label="Email">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </SocialLink>
              <SocialLink href="/press" label="Press">
                <Briefcase className="h-4 w-4" aria-hidden="true" />
              </SocialLink>
              <SocialLink href="/" label="Website">
                <Globe className="h-4 w-4" aria-hidden="true" />
              </SocialLink>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-surface-200 bg-surface-50 px-3 py-1.5 text-xs font-medium text-surface-700">
              <Shield className="h-3.5 w-3.5 text-success-600" aria-hidden="true" />
              All systems operational
              <Link
                href="/status"
                className="font-semibold text-brand-700 hover:underline"
              >
                status
              </Link>
            </div>
          </div>

          {/* Link columns */}
          <FooterCol title="Product" links={product} className="lg:col-span-2" />
          <FooterCol title="Company" links={company} className="lg:col-span-2" />
          <FooterCol title="Trust" links={trust} className="lg:col-span-2" />
          <FooterCol title="Legal" links={legal} className="lg:col-span-2" />
        </div>

        {/* Newsletter */}
        <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl border border-surface-200 bg-surface-50 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Stay in the loop
            </div>
            <h3 className="mt-2 text-lg font-bold tracking-tight text-surface-900">
              Get product updates and new sales in your area.
            </h3>
            <p className="mt-1 text-sm text-surface-600">
              No spam. Unsubscribe anytime. Email us to subscribe — we&apos;ll
              add you to the list within a business day.
            </p>
          </div>
          <a
            href="mailto:admin@garageroute.com?subject=Subscribe%20me%20to%20GarageRoute%20updates"
            className="btn btn-primary shrink-0"
          >
            Subscribe via email
          </a>
        </div>

        {/* Bottom strip */}
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-surface-200 pt-6 text-xs text-surface-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} GarageRoute, Inc. · All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse-soft" />
            Made for Saturday mornings.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  className = "",
}: {
  title: string;
  links: { href: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm font-medium text-surface-700 transition hover:text-brand-700"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-surface-200 bg-surface-0 text-surface-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
    >
      {children}
    </a>
  );
}
