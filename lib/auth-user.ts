import { cookies, headers } from "next/headers";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "gr_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const PASSWORD_RESET_DURATION_MS = 1000 * 60 * 60; // 1 hour

/* ---------- password hashing (scrypt — built into Node) ---------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const derived = await scrypt(password, salt, 64);
  const stored = Buffer.from(key, "hex");
  if (derived.length !== stored.length) return false;
  return timingSafeEqual(derived, stored);
}

/* ---------- validation helpers ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}
export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

/* ---------- session creation / lookup ---------- */

async function clientInfo(): Promise<{ ip: string; userAgent: string }> {
  let ip = "";
  let userAgent = "";
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "";
    userAgent = h.get("user-agent") || "";
  } catch {
    /* headers() throws outside a request context */
  }
  return { ip, userAgent };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const { ip, userAgent } = await clientInfo();
  await prisma.session.create({
    data: { userId, token, expiresAt, ip, userAgent },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  if (session.user.status !== "active") return null;
  return session.user;
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return u;
}

export async function requireAdminUser(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
  return u;
}

/* ---------- password reset helpers ---------- */

export async function issuePasswordReset(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return null;
  const token = randomBytes(32).toString("hex");
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_DURATION_MS),
    },
  });
  return token;
}

export async function consumePasswordReset(token: string, newPassword: string): Promise<boolean> {
  const row = await prisma.passwordReset.findUnique({ where: { token } });
  if (!row || row.usedAt) return false;
  if (row.expiresAt.getTime() < Date.now()) return false;
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  return true;
}

/* ---------- auth action audit helpers ---------- */

export async function auditUser(action: string, entityId: string, metadata: Record<string, unknown> = {}) {
  const { logAudit } = await import("@/lib/audit");
  await logAudit({ action: action as Parameters<typeof logAudit>[0]["action"], entity: "user", entityId, metadata });
}
