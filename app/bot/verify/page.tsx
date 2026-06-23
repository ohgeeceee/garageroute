import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Magic-link landing page.
 *
 *  - ?ok=1        → "you're verified, here's what to do next"
 *  - ?error=...   → friendly error message
 *
 * The cookie is set by /api/bot/auth/verify before this page renders,
 * so the user is already signed in. We just need to be polite about it.
 */

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "That link didn't work — it may have been edited. Request a new one from Scout.",
  used: "That link was already used. Request a new one from Scout.",
  expired: "That link expired. Scout sends links that last 15 minutes — request a new one.",
  no_account: "We couldn't find an account with that email. Sign up first, then come back.",
  missing: "Missing verification token.",
};

export default async function BotVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const ok = sp.ok === "1";
  const errorKey = sp.error ?? "";
  const next = sp.next || "/";
  const errorMessage = ERROR_MESSAGES[errorKey];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 px-6 py-16 text-surface-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        {ok ? (
          <>
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold">You&apos;re verified</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Scout can now help with your account. Head back to the chat and pick up where you left off.
            </p>
            <div className="mt-6 flex gap-2">
              <Link
                href={next}
                className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Back to GarageRoute
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Couldn&apos;t verify</h1>
            <p className="mt-2 text-sm text-zinc-600">
              {errorMessage || "Something went wrong. Try requesting a new link from Scout."}
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Back to home
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}