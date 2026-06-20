"use client";

import { useState } from "react";
import {
  Share2,
  Globe,
  AtSign,
  Mail,
  Link as LinkIcon,
  FileText,
  Check,
} from "lucide-react";

interface Props {
  sale: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    dates: string;
    hours: string;
    description: string;
    items?: { name: string; price?: number }[];
  };
}

export default function ShareButtons({ sale }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  // Use a stable base URL from env so server and client render identical markup.
  // Avoids hydration mismatches from `typeof window !== "undefined"` branches.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl.replace(/\/$/, "")}/sales/${sale.id}`;
  const text = `Check out this garage sale: ${sale.title}`;

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: sale.title, text, url });
      } catch {
        // user cancelled
      }
    } else {
      copy("link", url);
    }
  };

  const craigslistMarkdown = () => {
    const items = (sale.items || [])
      .slice(0, 8)
      .map((i) => `- ${i.name}${i.price ? ` ($${i.price})` : ""}`)
      .join("\n");
    return `${sale.title}

${sale.description}

Dates: ${sale.dates}
Hours: ${sale.hours}
Location: ${sale.address}, ${sale.city}, ${sale.state} ${sale.zip}

Featured items:
${items || "Lots of great items!"}

See photos and live inventory: ${url}
`;
  };

  const buttons = [
    {
      label: "Share",
      icon: Share2,
      onClick: nativeShare,
    },
    {
      label: "Facebook",
      icon: Globe,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
    },
    {
      label: "X / Twitter",
      icon: AtSign,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(
        sale.title
      )}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    },
    {
      label: copied === "link" ? "Copied!" : "Copy link",
      icon: copied === "link" ? Check : LinkIcon,
      onClick: () => copy("link", url),
    },
    {
      label: copied === "craigslist" ? "Copied!" : "Craigslist text",
      icon: copied === "craigslist" ? Check : FileText,
      onClick: () => copy("craigslist", craigslistMarkdown()),
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((b) => {
        const className =
          "inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50";
        const content = (
          <>
            <b.icon className="h-4 w-4" />
            {b.label}
          </>
        );
        return b.href ? (
          <a
            key={b.label}
            href={b.href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {content}
          </a>
        ) : (
          <button key={b.label} onClick={b.onClick} className={className}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
