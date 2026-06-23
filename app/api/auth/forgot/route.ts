import { NextRequest, NextResponse } from "next/server";
import { issuePasswordReset, isValidEmail, normalizeEmail, auditUser } from "@/lib/auth-user";
import { sendEmail, emailEnabled } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Issues a password-reset token.
 *
 * If RESEND_API_KEY is set, sends a real email.
 * Otherwise, logs the reset URL to the server console so an admin can paste it.
 */
export async function POST(req: NextRequest) {
  // Rate limit per IP: 3 reset requests / 10 minutes. A forgot-password
  // page should not be a scriptable entry point.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rl = rateLimit(`forgot:${ip}`, { limit: 3, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    // Don't leak — return the same response shape.
    return NextResponse.json({ ok: true });
  }

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
    const subject = "Reset your GarageRoute password";
    const text =
      `Hi,\n\n` +
      `Someone (hopefully you) asked to reset the password for ${email} on GarageRoute.\n\n` +
      `Click this link to choose a new password (valid for 1 hour):\n${url}\n\n` +
      `If you didn't ask for this, you can ignore this email — nothing changes until you click.\n\n` +
      `— GarageRoute`;

    const result = await sendEmail({ to: email, subject, text });

    if (!result.ok) {
       
      console.log(`[password-reset] ${email} → ${url} (email send failed: ${result.error})`);
    }

    await auditUser("user.password_reset_requested", email, {
      delivered: result.ok,
      skipped: result.skipped,
    });
  }

  // Always respond ok — don't leak whether email exists
  return NextResponse.json({ ok: true });
}
