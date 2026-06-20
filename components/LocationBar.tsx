"use client";

import { useState, useTransition } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import {
  type StoredLocation,
  getStoredLocation,
  setStoredLocation,
  requestBrowserGeolocation,
  geocodeZip,
} from "@/lib/location";

type Props = {
  location: StoredLocation | null;
  onChange: (location: StoredLocation | null) => void;
};

const ZIP_RE = /^\d{5}(-\d{4})?$/;

export default function LocationBar({ location, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const handleUseGeo = async () => {
    setBusy(true);
    setError("");
    const result = await requestBrowserGeolocation();
    setBusy(false);
    if (result.ok) {
      setStoredLocation(result.location);
      startTransition(() => onChange(result.location));
      setEditing(false);
    } else {
      setError(result.reason);
    }
  };

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ZIP_RE.test(zip)) {
      setError("Enter a 5-digit US zip code.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await geocodeZip(zip);
    setBusy(false);
    if (result.ok) {
      setStoredLocation(result.location);
      startTransition(() => onChange(result.location));
      setEditing(false);
      setZip("");
    } else {
      setError(result.reason);
    }
  };

  const handleClear = () => {
    setStoredLocation({} as StoredLocation); // noop — handled below
    // Properly clear:
    try {
      window.localStorage.removeItem("gr:home_location:v1");
    } catch {
      /* noop */
    }
    startTransition(() => onChange(null));
  };

  if (!location || editing) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-900">
              Show garage sales near you
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              We&apos;ll filter the list to your area. Nothing leaves your browser.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={handleUseGeo}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Use my location
              </button>
              <span className="text-xs text-zinc-500">or</span>
              <form onSubmit={handleZipSubmit} className="flex flex-1 gap-2">
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="Zip code"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={10}
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Set
                </button>
              </form>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
            {location && (
              <button
                onClick={() => setEditing(false)}
                className="mt-3 text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const label =
    [location.city, location.state].filter(Boolean).join(", ") +
    (location.zip ? ` ${location.zip}` : "");

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-zinc-700">
        <MapPin className="h-4 w-4 text-blue-600" />
        <span>
          Showing sales near <strong className="font-semibold text-zinc-900">{label || "your area"}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Change
        </button>
        <button
          onClick={handleClear}
          className="text-zinc-400 hover:text-zinc-600"
          aria-label="Clear location"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Helper hook for components that want to read it once on mount.
export function useInitialLocation(): StoredLocation | null {
  return getStoredLocation();
}