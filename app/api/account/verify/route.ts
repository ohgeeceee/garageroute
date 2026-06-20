import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, auditUser } from "@/lib/auth-user";
import { getStorage, buildStorageKey } from "@/lib/storage";
import { scanBuffer } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

/* ---------- File validation ---------- */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }

  // Rate limit: max 5 submissions per user per hour
  const rl = rateLimit(`verify:${user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many submissions. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const ct = req.headers.get("content-type") || "";
  let notes = "";
  let documentUrl = ""; // legacy external URL fallback
  let storedKey = "";
  let storedName = "";
  let storedMime = "";
  let storedBytes = 0;

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    notes = String(form.get("notes") ?? "").slice(0, 1000);
    documentUrl = String(form.get("documentUrl") ?? "").slice(0, 500);

    const file = form.get("document");
    if (file && file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `File too large. Max ${MAX_BYTES / 1024 / 1024} MB.` }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({ error: `Unsupported file type: ${file.type}. Use JPEG, PNG, WebP, HEIC, or PDF.` }, { status: 400 });
      }

      const buf = Buffer.from(await file.arrayBuffer());

      // Virus scan (clamav if available; otherwise soft-warn — see lib/security.ts)
      const scan = await scanBuffer(buf, file.type, file.name);
      if (!scan.clean) {
        await auditUser("user.verification_upload_rejected", user.id, {
          reason: scan.reason,
          fileName: file.name,
          fileSize: file.size,
        });
        return NextResponse.json(
          { error: `Upload rejected by security scan: ${scan.reason}` },
          { status: 400 }
        );
      }

      // Store via the storage abstraction (local or S3)
      const storage = getStorage();
      const key = buildStorageKey("verifications", file.type, file.name);
      await storage.put(key, buf, file.type);
      storedKey = key;
      storedName = safeFilename(file.name) || `id.${key.split(".").pop()}`;
      storedMime = file.type;
      storedBytes = file.size;
    } else if (!documentUrl) {
      return NextResponse.json({ error: "Provide an ID file or a document URL." }, { status: 400 });
    }
  } else {
    // JSON body (legacy)
    let body: { notes?: string; documentUrl?: string };
    try { body = await req.json(); } catch { body = {}; }
    notes = String(body.notes ?? "").slice(0, 1000);
    documentUrl = String(body.documentUrl ?? "").slice(0, 500);
    if (!documentUrl) {
      return NextResponse.json({ error: "Provide a document URL or upload a file." }, { status: 400 });
    }
  }

  // Cancel any existing pending request
  await prisma.userVerification.updateMany({
    where: { userId: user.id, status: "pending" },
    data: { status: "superseded" },
  });

  const created = await prisma.userVerification.create({
    data: {
      userId: user.id,
      notes,
      documentUrl,
      documentPath: storedKey,
      documentName: storedName,
      documentMime: storedMime,
      documentBytes: storedBytes,
      status: "pending",
    },
  });

  await auditUser("user.verification_submitted", user.id, {
    verificationId: created.id,
    storageDriver: getStorage().driver,
    hasFile: storedKey.length > 0,
    bytes: storedBytes,
  });

  return NextResponse.json({ ok: true, id: created.id });
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const items = await prisma.userVerification.findMany({
    where: { userId: user.id },
    orderBy: { submittedAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ items });
}
