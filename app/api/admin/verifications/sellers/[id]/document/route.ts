import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

/**
 * Streams (or redirects to) the ID document for a pending seller verification.
 * Admin-only. Picks the right strategy based on the active storage driver:
 *  - local: reads the file from disk and streams it
 *  - s3:    issues a short-lived presigned URL and 302-redirects
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const row = await prisma.userVerification.findUnique({
    where: { id },
    select: { documentPath: true, documentMime: true, documentName: true, documentBytes: true, documentUrl: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Legacy external URL — redirect
  if (row.documentUrl && !row.documentPath) {
    return NextResponse.redirect(row.documentUrl);
  }

  if (!row.documentPath) {
    return NextResponse.json({ error: "No document on file" }, { status: 404 });
  }

  const storage = getStorage();

  // S3 driver — hand off to a presigned URL (no body leaves our server)
  if (storage.driver === "s3") {
    try {
      const url = await storage.getReadUrl(row.documentPath, 300);
      return NextResponse.redirect(url, { status: 302 });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[verifications/document] presign failed", e);
      return NextResponse.json({ error: "Failed to generate access URL" }, { status: 500 });
    }
  }

  // Local driver — stream the file
  const obj = await storage.get(row.documentPath);
  if (!obj) {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }
  const filename = row.documentName || "id";
  // Buffer extends Uint8Array, but NextResponse's typed constructor narrows to
  // a BodyInit shape that doesn't structurally match newer ArrayBuffer-backed
  // Uint8Array generics. Cast through BodyInit — runtime is fine; this is a
  // TS lib version mismatch.
  const body = obj.body as unknown as BodyInit;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": row.documentMime || obj.mimeType || "application/octet-stream",
      "Content-Length": String(obj.size || row.documentBytes || obj.body.length),
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
