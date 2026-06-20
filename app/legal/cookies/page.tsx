import LegalLayout, { LegalSection } from "@/components/LegalLayout";

export const metadata = {
  title: "Cookie Policy — GarageRoute",
  description:
    "What cookies and similar technologies GarageRoute uses, why we use them, and how to control them.",
};

const sections: LegalSection[] = [
  {
    id: "what-are-cookies",
    heading: "What are cookies?",
    body: (
      <p>
        Cookies are small text files stored on your device when you visit a
        website. We also use similar technologies like local storage and
        IndexedDB. Together, these help us keep you signed in, remember your
        preferences, and measure how the Service is used.
      </p>
    ),
  },
  {
    id: "what-we-use",
    heading: "Cookies we use",
    body: (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200 text-left text-xs uppercase tracking-wider text-surface-500">
            <th className="py-2 pr-3 font-semibold">Name</th>
            <th className="py-2 pr-3 font-semibold">Purpose</th>
            <th className="py-2 font-semibold">Lifetime</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          <tr>
            <td className="py-3 pr-3 font-mono text-xs text-surface-700">admin_session</td>
            <td className="py-3 pr-3 text-surface-700">
              Authenticates administrators on the console.
            </td>
            <td className="py-3 text-surface-700">7 days, httpOnly</td>
          </tr>
          <tr>
            <td className="py-3 pr-3 font-mono text-xs text-surface-700">gr_route</td>
            <td className="py-3 pr-3 text-surface-700">
              Remembers the items in your saved route.
            </td>
            <td className="py-3 text-surface-700">Persistent</td>
          </tr>
          <tr>
            <td className="py-3 pr-3 font-mono text-xs text-surface-700">gr_theme</td>
            <td className="py-3 pr-3 text-surface-700">
              Remembers your theme and density preferences.
            </td>
            <td className="py-3 text-surface-700">1 year</td>
          </tr>
          <tr>
            <td className="py-3 pr-3 font-mono text-xs text-surface-700">_gr_id</td>
            <td className="py-3 pr-3 text-surface-700">
              Anonymous session identifier for analytics.
            </td>
            <td className="py-3 text-surface-700">30 minutes</td>
          </tr>
        </tbody>
      </table>
    ),
  },
  {
    id: "third-party",
    heading: "Third-party cookies",
    body: (
      <p>
        We do not place advertising cookies. We use a small set of operational
        third-party services (such as Stripe for payments and a map tile
        provider) that may set their own cookies. Those services are governed
        by their own privacy policies.
      </p>
    ),
  },
  {
    id: "control",
    heading: "How to control cookies",
    body: (
      <ul className="ml-5 list-disc space-y-1.5">
        <li>
          Use your browser&apos;s settings to block or delete cookies. Most
          modern browsers let you block third-party cookies while keeping
          first-party cookies.
        </li>
        <li>
          If you block essential cookies (like <code>admin_session</code>),
          parts of the Service may not work.
        </li>
        <li>
          To opt out of analytics storage, enable your browser&apos;s
          &ldquo;Do Not Track&rdquo; or &ldquo;Global Privacy Control&rdquo;
          signal and we&apos;ll honor it.
        </li>
      </ul>
    ),
  },
  {
    id: "changes",
    heading: "Changes",
    body: (
      <p>
        We&apos;ll update this page if we add or remove cookies in a
        material way. The &ldquo;Last updated&rdquo; date at the top reflects
        the current version.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      intro="Plain-English summary: we use a small set of first-party cookies to keep the Service working. We do not use advertising cookies."
      lastUpdated="January 15, 2026"
      sections={sections}
    />
  );
}
