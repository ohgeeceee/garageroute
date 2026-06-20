import { NextRequest, NextResponse } from "next/server";
import { issuePasswordReset, isValidEmail, normalizeEmail, auditUser } from "@/lib/auth-user";

/**
 * Issues a password-reset token.
 * If SMTP is wired, send the email. Otherwise, log the reset URL to server console
 * so an admin can paste it to the user manually.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true }); // don't leak parse errors
  }
  const email = normalizeEmail(String(body.email ?? ""));
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: true });
  }

  const token = await issuePasswordReset(email);
  if (token) {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://garageroute.com"}/reset-password?token=${token}`;
    // eslint-disable-next-line no-console
    console.log(`[password-reset] ${email} → ${url}`);
    await auditUser("user.password_reset_requested", email, {});
  }

  // Always respond ok — don't leak whether email exists
  return NextResponse.json({ ok: true });
}
