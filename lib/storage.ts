/**
 * Storage abstraction for user-uploaded files (currently ID verification docs).
 *
 * Two drivers:
 *  - "local"  (default) — writes to ./uploads/<key>; admin reads via internal API.
 *  - "s3"     — writes to S3-compatible bucket (AWS S3, Cloudflare R2, DO Spaces).
 *               Admin reads via short-lived presigned URLs.
 *
 * Selected via env: STORAGE_DRIVER=local|s3 (+ S3_* envs).
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readFile, writeFile, mkdir, unlink, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export type PutResult = { key: string; size: number; mimeType: string };
export type StoredObject = { key: string; size: number; mimeType: string; body: Buffer };

export interface StorageProvider {
  readonly driver: "local" | "s3";
  put(key: string, body: Buffer, mimeType: string): Promise<PutResult>;
  /**
   * Presigned URL the browser / mobile app uses to PUT a file directly to the
   * bucket. Server never sees the bytes — keeps Next.js bandwidth flat as
   * uploads scale. Only meaningful on the S3 driver; the local driver returns
   * a same-origin upload URL.
   */
  getUploadUrl(key: string, mimeType: string, expiresInSec?: number): Promise<string>;
  get(key: string): Promise<StoredObject | null>;
  getReadUrl(key: string, expiresInSec?: number): Promise<string>;
  /** Resolve a key to a publicly-fetchable URL (no signing) when the bucket is public. */
  resolvePublicUrl(key: string): string | null;
  delete(key: string): Promise<void>;
}

/* =========================================================
   Local driver — file under ./uploads/<key>
   ========================================================= */

class LocalStorageProvider implements StorageProvider {
  readonly driver = "local" as const;
  private root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    // Defend against ../ traversal — key must stay under root
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep) && full !== this.root) {
      throw new Error("Invalid key: path traversal");
    }
    return full;
  }

  async put(key: string, body: Buffer, mimeType: string): Promise<PutResult> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body, { mode: 0o640 });
    return { key, size: body.length, mimeType };
  }

  async get(key: string): Promise<StoredObject | null> {
    const full = this.resolve(key);
    if (!existsSync(full)) return null;
    const s = await stat(full);
    const body = await readFile(full);
    return { key, size: s.size, mimeType: "", body };
  }

  async getReadUrl(key: string): Promise<string> {
    // Caller is responsible for routing this through an authenticated API route.
    // We return a stable internal URL the API layer can interpret.
    return `/api/storage/local?key=${encodeURIComponent(key)}`;
  }

  async getUploadUrl(key: string, _mimeType: string, _expiresInSec?: number): Promise<string> {
    // Local driver has no real presigning — return the same internal upload URL.
    // The route handler that owns this URL enforces auth + ownership.
    return `/api/storage/local?key=${encodeURIComponent(key)}`;
  }

  resolvePublicUrl(_key: string): string | null {
    // Local driver never has public URLs — files are served by an authenticated
    // internal API. Returning null forces callers to use getReadUrl.
    return null;
  }

  async delete(key: string): Promise<void> {
    const full = this.resolve(key);
    if (existsSync(full)) await unlink(full);
  }
}

/* =========================================================
   S3 driver — AWS S3 / Cloudflare R2 / DO Spaces compatible
   ========================================================= */

class S3StorageProvider implements StorageProvider {
  readonly driver = "s3" as const;
  private client: S3Client;
  private bucket: string;
  private publicUrlBase?: string;

  constructor() {
    const region = requireEnv("S3_REGION");
    const endpoint = process.env.S3_ENDPOINT || undefined; // R2 / DO Spaces need this
    const accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
    const secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
    this.bucket = requireEnv("S3_BUCKET");
    this.publicUrlBase = process.env.S3_PUBLIC_URL?.replace(/\/$/, "") || undefined;

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: !!endpoint, // R2 / DO Spaces require path-style
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, mimeType: string): Promise<PutResult> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    }));
    return { key, size: body.length, mimeType };
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const body = await streamToBuffer(res.Body as NodeJS.ReadableStream);
      const size = Number(res.ContentLength ?? body.length);
      return { key, size, mimeType: res.ContentType ?? "", body };
    } catch (e: unknown) {
      const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) return null;
      throw e;
    }
  }

  async getReadUrl(key: string, expiresInSec = 300): Promise<string> {
    if (this.publicUrlBase && !process.env.S3_FORCE_SIGNED) {
      // Public bucket — return direct URL (still cache-bust if you want)
      return `${this.publicUrlBase}/${key}`;
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSec }
    );
  }

  async getUploadUrl(key: string, mimeType: string, expiresInSec = 300): Promise<string> {
    // Browser/mobile uploads directly to bucket with this URL.
    // The signed URL locks the Content-Type so the client can't lie about it.
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
      }),
      { expiresIn: expiresInSec }
    );
  }

  resolvePublicUrl(key: string): string | null {
    if (!this.publicUrlBase) return null;
    return `${this.publicUrlBase}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

/* =========================================================
   Helpers
   ========================================================= */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/* =========================================================
   Factory — pick the right driver at boot
   ========================================================= */

let _instance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (_instance) return _instance;
  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  if (driver === "s3") {
    _instance = new S3StorageProvider();
  } else {
    const root = process.env.STORAGE_LOCAL_ROOT || path.join(process.cwd(), "uploads");
    _instance = new LocalStorageProvider(root);
  }
  return _instance;
}

/* =========================================================
   Key helpers — keep filenames safe and unguessable,
   and scope every user-writable key under the owner's id.
   ========================================================= */

import crypto from "node:crypto";

const SAFE_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export function buildStorageKey(prefix: string, mimeType: string, originalName?: string): string {
  const ext = SAFE_MIME_EXT[mimeType]
    || (originalName?.match(/\.([a-z0-9]{1,5})$/i)?.[1].toLowerCase() ?? "bin");
  return `${prefix.replace(/\/$/, "")}/${crypto.randomUUID()}.${ext}`;
}

/* ---------- Public scopes users can upload into ----------
 * Each scope maps to a key prefix that embeds the user id, so the delete
 * handler can authorize by checking `key.split("/")[1] === userId`.
 */
export const UPLOAD_SCOPES = {
  sales: "sales",          // photos for a sale listing — sales/{userId}/{uuid}.{ext}
  items: "items",          // item-level photo (optional) — items/{userId}/{uuid}.{ext}
  avatar: "users",         // user avatar — users/{userId}/avatar/{uuid}.{ext}
  verification: "verifications", // ID docs (existing flow, see /api/account/verify)
} as const;
export type UploadScope = keyof typeof UPLOAD_SCOPES;

export function buildUserKey(scope: UploadScope, userId: string, mimeType: string, originalName?: string): string {
  if (!userId || !/^[a-zA-Z0-9_-]{4,64}$/.test(userId)) {
    throw new Error("Invalid userId");
  }
  const ext = SAFE_MIME_EXT[mimeType]
    || (originalName?.match(/\.([a-z0-9]{1,5})$/i)?.[1].toLowerCase() ?? "bin");
  const uuid = crypto.randomUUID();
  switch (scope) {
    case "sales":        return `sales/${userId}/${uuid}.${ext}`;
    case "items":        return `items/${userId}/${uuid}.${ext}`;
    case "avatar":       return `users/${userId}/avatar/${uuid}.${ext}`;
    case "verification": return `verifications/${userId}/${uuid}.${ext}`;
  }
}

/**
 * Returns the owning userId encoded in a key, or null if the key is not in a
 * recognized user-scoped prefix. Used by the delete handler to authorize.
 */
export function ownerOfKey(key: string): string | null {
  const parts = key.split("/");
  if (parts.length < 3) return null;
  const [scope, owner] = parts;
  if (scope !== "sales" && scope !== "items" && scope !== "users" && scope !== "verifications") return null;
  if (scope === "users" && parts[2] !== "avatar") return null; // only avatar under users/
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(owner)) return null;
  return owner;
}
