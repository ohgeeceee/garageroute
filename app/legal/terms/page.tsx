import LegalLayout, { LegalSection } from "@/components/LegalLayout";

export const metadata = {
  title: "Terms of Service — GarageRoute",
  description:
    "The terms and conditions that govern your use of the GarageRoute marketplace.",
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    heading: "1. Agreement",
    body: (
      <p>
        By accessing or using GarageRoute (the &ldquo;Service&rdquo;), you
        agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If
        you don&apos;t agree, please don&apos;t use the Service. We may update
        these Terms from time to time — continued use after changes means
        you&apos;ve accepted them.
      </p>
    ),
  },
  {
    id: "eligibility",
    heading: "2. Eligibility",
    body: (
      <p>
        You must be at least 18 years old and legally able to enter into a
        binding contract in your jurisdiction to post sales or make
        reservations. By using the Service, you represent that you meet these
        requirements.
      </p>
    ),
  },
  {
    id: "accounts",
    heading: "3. Accounts and seller tokens",
    body: (
      <>
        <p>
          Posting a sale issues you a unique, cryptographically random{" "}
          <strong>seller token</strong> (e.g. <code className="rounded bg-surface-100 px-1 py-0.5 text-xs">/manage/&lt;token&gt;</code>).
          This token is the only credential required to manage your sale. Treat
          it like a password.
        </p>
        <p>
          You&apos;re responsible for activity performed with your token. We
          strongly recommend saving the management link we email you. If you
          lose it, contact support to recover the listing under verified
          identity.
        </p>
      </>
    ),
  },
  {
    id: "listings",
    heading: "4. Listings and content",
    body: (
      <ul className="ml-5 list-disc space-y-1.5">
        <li>
          You must have the legal right to sell everything you list. GarageRoute
          is not a venue for stolen goods, recalled items, counterfeit goods, or
          regulated goods (firearms, prescription medications, etc.).
        </li>
        <li>
          Listings must accurately describe the items, including condition
          defects. Misrepresentation may result in removal and account
          suspension.
        </li>
        <li>
          You retain ownership of your photos and descriptions. By posting, you
          grant us a non-exclusive, worldwide license to display that content
          on the Service.
        </li>
        <li>
          We may remove or modify listings that violate these Terms or that we
          reasonably believe violate the law.
        </li>
      </ul>
    ),
  },
  {
    id: "transactions",
    heading: "5. Transactions, holds, and reservations",
    body: (
      <p>
        GarageRoute offers optional item <strong>reservations</strong> with a
        small deposit hold. Reservations are an agreement between you and the
        seller; GarageRoute processes the deposit as a payment service
        provider but is not a party to the underlying sale. Refunds for no-shows
        are at the seller&apos;s discretion unless the platform intervenes for
        trust-and-safety reasons.
      </p>
    ),
  },
  {
    id: "fees",
    heading: "6. Fees",
    body: (
      <p>
        Browsing, posting, and basic messaging are currently free. We may
        introduce optional paid features in the future; we&apos;ll always
        notify you before charging and give you a chance to opt out.
      </p>
    ),
  },
  {
    id: "prohibited",
    heading: "7. Prohibited conduct",
    body: (
      <ul className="ml-5 list-disc space-y-1.5">
        <li>Impersonating another person or business.</li>
        <li>Spamming, scraping, or otherwise abusing the Service.</li>
        <li>Posting illegal, harmful, or misleading content.</li>
        <li>Circumventing our moderation or verification systems.</li>
        <li>Interfering with the Service or other users&apos; enjoyment of it.</li>
      </ul>
    ),
  },
  {
    id: "ip",
    heading: "8. Intellectual property",
    body: (
      <p>
        The Service, including its design, code, branding, and trademarks, is
        owned by GarageRoute, Inc. and protected by intellectual property laws.
        You may not copy, distribute, or create derivative works without our
        written permission.
      </p>
    ),
  },
  {
    id: "termination",
    heading: "9. Suspension and termination",
    body: (
      <p>
        We may suspend or terminate access to the Service at any time, with or
        without notice, for conduct that violates these Terms or that we
        reasonably believe is harmful to other users, us, or third parties.
        You may stop using the Service at any time.
      </p>
    ),
  },
  {
    id: "disclaimers",
    heading: "10. Disclaimers and liability",
    body: (
      <>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF
          ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, GARAGEROUTE
          DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.
        </p>
        <p>
          In no event will GarageRoute&apos;s total liability arising out of or
          related to these Terms exceed the greater of (a) the fees you paid
          us in the 12 months preceding the claim, or (b) one hundred U.S.
          dollars (US$100).
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    heading: "11. Governing law",
    body: (
      <p>
        These Terms are governed by the laws of the State of Colorado, without
        regard to its conflict-of-law principles. Any disputes will be resolved
        exclusively in the state or federal courts located in Denver,
        Colorado.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "12. Contact",
    body: (
      <p>
        Questions about these Terms? Email{" "}
        <a
          href="mailto:admin@garageroute.com"
          className="font-semibold text-brand-700 hover:underline"
        >
          admin@garageroute.com
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      intro="The rules of the road. Plain-English summaries of what you can expect from us — and what we ask of you in return."
      lastUpdated="January 15, 2026"
      sections={sections}
      contactEmail="admin@garageroute.com"
    />
  );
}
