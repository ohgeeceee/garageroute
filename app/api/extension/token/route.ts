/**
 * POST/DELETE /api/extension/token
 *
 * Mint or revoke a Chrome-extension bearer token. Auth: signed-in user.
 *
 * POST body (optional):
 *   { label?: string, scopeZip?, scopeCity?, scopeState? }
 *
 * Returns:
 *   { token, expiresAt }    // plaintext token — only chance to copy it
 *
 * DELETE body:
 *   { tokenId }            // revokes a specific token
 *   or {}                   // revokes all tokens for the current user
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_TTL_DAYS = 90;

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }

  let body: { label?: string; scopeZip?: string; scopeCity?: string; scopeState?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Cap how many active tokens a user can hold. Five devices is plenty.
  const activeCount = await prisma.extensionToken.count({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (activeCount >= 5) {
    return NextResponse.json(
      { error: "Too many active tokens. Revoke an old one first." },
      { status: 400 }
    );
  }

  const plaintext = randomBytes(32).toString("hex");
  const tokenHash = sha256(plaintext);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const ua = req.headers.get("user-agent") || "";

  const created = await prisma.extensionToken.create({
    data: {
      userId: user.id,
      tokenHash,
      label: String(body.label || "").slice(0, 80),
      userAgent: ua.slice(0, 300),
      scopeZip: String(body.scopeZip || "").slice(0, 10),
      scopeCity: String(body.scopeCity || "").slice(0, 80),
      scopeState: String(body.scopeState || "").slice(0, 8),
      expiresAt,
    },
  });

  return NextResponse.json({
    token: plaintext,
    tokenId: created.id,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }

  let body: { tokenId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.tokenId) {
    await prisma.extensionToken.updateMany({
      where: { id: body.tokenId, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } else {
    await prisma.extensionToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const tokens = await prisma.extensionToken.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      scopeZip: true,
      scopeCity: true,
      scopeState: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
    },
  });
  return NextResponse.json({ tokens });
}