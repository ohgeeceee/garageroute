"use client";

import { Globe } from "lucide-react";

type StateOption = {
  slug: string;
  name: string;
  status: string;
};

type Props = {
  /** All states fetched server-side and passed in. */
  states: StateOption[];
};

export default function StatePicker({ states }: Props) {
  const live = states.filter((s) => s.status === "live");
  const comingSoon = states.filter((s) => s.status !== "live");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) return;
    const [slug, status] = value.split("|");
    if (status === "live") {
      window.location.href = `https://${slug}.garageroute.com`;
    } else {
      window.location.href = `/states#${slug}`;
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <Globe className="pointer-events-none absolute left-3 h-4 w-4 text-surface-500" aria-hidden="true" />
      <select
        onChange={handleChange}
        defaultValue=""
        className="input pl-9 pr-8 text-sm"
        aria-label="Select a state"
      >
        <option value="" disabled>
          Choose a state
        </option>
        {live.length > 0 && (
          <>
            <optgroup label="Live now">
              {live.map((s) => (
                <option key={s.slug} value={`${s.slug}|live`}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          </>
        )}
        {comingSoon.length > 0 && (
          <>
            <optgroup label="Coming soon">
              {comingSoon.map((s) => (
                <option key={s.slug} value={`${s.slug}|preview`}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          </>
        )}
      </select>
    </div>
  );
}
