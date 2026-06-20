import LegalLayout, { LegalSection } from "@/components/LegalLayout";

export const metadata = {
  title: "Privacy Policy — GarageRoute",
  description:
    "How GarageRoute collects, uses, and protects your information across our marketplace.",
};

const sections: LegalSection[] = [
  {
    id: "overview",
    heading: "Overview",
    body: (
      <>
        <p>
          GarageRoute (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
          operates the website at <strong>garageroute.com</strong> and the
          GarageRoute mobile applications. This Privacy Policy explains what
          information we collect when you use our service, how we use it, and
          the choices you have.
        </p>
        <p>
          We design our marketplace around two principles: collect only what we
          need, and let you delete it whenever you want. If something is
          unclear, email us at{" "}
          <a
            href="mailto:privacy@garageroute.com"
            className="font-semibold text-brand-700 hover:underline"
          >
            privacy@garageroute.com
          </a>{" "}
          and we&apos;ll explain.
        </p>
      </>
    ),
  },
  {
    id: "info-we-collect",
    heading: "Information we collect",
    body: (
      <>
        <p>We collect three categories of information:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Account information</strong> — name, email, and password
            hash if you create a seller account. Buyer accounts are created
            implicitly when you sign up for alerts or message a seller.
          </li>
          <li>
            <strong>Listing content</strong> — sale descriptions, photos, item
            names, prices, and locations you post. Photos you upload may contain
            EXIF metadata (location, time, device) which we strip before
            publishing.
          </li>
          <li>
            <strong>Usage data</strong> — pages viewed, searches run, alerts
            triggered, and aggregate clicks. We use this to improve search
            ranking and detect abuse.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    heading: "How we use your information",
    body: (
      <ul className="ml-5 list-disc space-y-1.5">
        <li>To show your listings and messages to other users as intended.</li>
        <li>
          To send transactional emails (sale confirmations, message
          notifications, reservation receipts).
        </li>
        <li>
          To send alerts you&apos;ve subscribed to. You can unsubscribe in one
          click from any email.
        </li>
        <li>
          To detect and prevent fraud, spam, and abuse. Automated systems may
          flag suspicious content for human review.
        </li>
        <li>
          To comply with legal obligations and respond to valid law-enforcement
          requests.
        </li>
      </ul>
    ),
  },
  {
    id: "sharing",
    heading: "What we share",
    body: (
      <>
        <p>
          We do not sell your personal information. Period. We share data only
          in the following cases:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>With other users as intended.</strong> When you post a
            sale, public listing details are visible to anyone browsing. When
            you message a seller, your message and display name are shared with
            that seller.
          </li>
          <li>
            <strong>With service providers.</strong> We use a small set of
            vendors (hosting, email delivery, payment processing) who process
            data on our behalf under written agreements.
          </li>
          <li>
            <strong>For legal reasons.</strong> If we receive a valid subpoena,
            court order, or similar legal process.
          </li>
          <li>
            <strong>Business transfers.</strong> If GarageRoute is acquired or
            merges, your information may be transferred under continued
            protection of this policy.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies and similar technologies",
    body: (
      <p>
        We use a small number of cookies and local-storage entries to keep you
        signed in, remember your route, and measure traffic. We do not use
        third-party advertising cookies. See our{" "}
        <a
          href="/legal/cookies"
          className="font-semibold text-brand-700 hover:underline"
        >
          Cookie Policy
        </a>{" "}
        for details.
      </p>
    ),
  },
  {
    id: "your-rights",
    heading: "Your rights and choices",
    body: (
      <ul className="ml-5 list-disc space-y-1.5">
        <li>
          <strong>Access & export.</strong> Request a copy of all data we hold
          about you. We deliver within 30 days.
        </li>
        <li>
          <strong>Delete.</strong> Delete your account and we erase associated
          personal data within 30 days. Public listings may be retained in
          anonymized form for trust-and-safety records.
        </li>
        <li>
          <strong>Correct.</strong> Update incorrect information directly in
          your dashboard, or email us and we&apos;ll fix it.
        </li>
        <li>
          <strong>Unsubscribe.</strong> Every marketing email has a one-click
          unsubscribe link.
        </li>
      </ul>
    ),
  },
  {
    id: "security",
    heading: "How we protect your data",
    body: (
      <p>
        We use industry-standard encryption in transit (TLS 1.2+) and at rest.
        Seller accounts are protected by single-use, cryptographically random
        tokens issued at posting time. Admin actions are logged in an
        immutable audit trail. See our{" "}
        <a
          href="/security"
          className="font-semibold text-brand-700 hover:underline"
        >
          Security page
        </a>{" "}
        for the full picture.
      </p>
    ),
  },
  {
    id: "children",
    heading: "Children&apos;s privacy",
    body: (
      <p>
        GarageRoute is not directed to children under 13, and we do not
        knowingly collect information from them. If you believe a child has
        created an account, contact us and we&apos;ll remove it.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: (
      <p>
        If we make material changes, we&apos;ll email active account holders at
        least 30 days before the change takes effect and post a notice on our
        homepage.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <p>
        Privacy questions? Email{" "}
        <a
          href="mailto:privacy@garageroute.com"
          className="font-semibold text-brand-700 hover:underline"
        >
          privacy@garageroute.com
        </a>
        . Our Data Protection Officer reviews every request.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="We collect only what we need, we never sell your data, and we make it easy to delete everything. This page explains exactly what that means in practice."
      lastUpdated="January 15, 2026"
      sections={sections}
      contactEmail="privacy@garageroute.com"
    />
  );
}
