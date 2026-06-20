"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X, GripVertical } from "lucide-react";

/**
 * <PhotoUploader />
 *
 * Uploads images directly to S3 via presigned PUT (signed by /api/uploads/sign).
 * Browser → S3 traffic never touches Next.js — server only sees metadata.
 *
 * Emits a stable list of storage KEYS (not URLs) so the parent can store them
 * and the API layer can resolve to public URLs at the edge. Local-dev fallback
 * shows a blob preview until the parent persists the sale.
 */

export type PhotoEntry = {
  /** Unique id for this UI entry (stable across reorders). */
  uid: string;
  /** Storage key — what gets stored in Sale.photos. */
  key: string | null;
  /** Public URL when the bucket is public-read; null for the local driver. */
  publicUrl: string | null;
  /** Object URL for in-progress previews before the key is known. */
  previewUrl: string;
  status: "uploading" | "done" | "error";
  progress: number; // 0..100
  error?: string;
};

export type PhotoUploaderProps = {
  scope: "sales" | "items" | "avatar";
  value: PhotoEntry[];
  onChange: (next: PhotoEntry[]) => void;
  max?: number;
  accept?: string;
  className?: string;
};

const DEFAULT_MAX = 8;
const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

let _uid = 0;
const nextUid = () => `p${Date.now().toString(36)}_${(_uid++).toString(36)}`;

export function PhotoUploader({
  scope,
  value,
  onChange,
  max = DEFAULT_MAX,
  accept = DEFAULT_ACCEPT,
  className = "",
}: PhotoUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke any blob URLs we created when this component unmounts.
  useEffect(() => {
    return () => {
      for (const e of value) {
        if (e.previewUrl.startsWith("blob:")) URL.revokeObjectURL(e.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateEntry = useCallback(
    (uid: string, patch: Partial<PhotoEntry>) => {
      onChange(value.map((e) => (e.uid === uid ? { ...e, ...patch } : e)));
    },
    [value, onChange],
  );

  const removeEntry = useCallback(
    (uid: string) => {
      const target = value.find((e) => e.uid === uid);
      if (target) {
        if (target.previewUrl.startsWith("blob:")) URL.revokeObjectURL(target.previewUrl);
        // Best-effort server-side delete. Failure here just leaks the object —
        // a janitor cron will sweep orphans later.
        if (target.key) {
          fetch(`/api/uploads/${target.key.split("/").map(encodeURIComponent).join("/")}`, {
            method: "DELETE",
          }).catch(() => {});
        }
      }
      onChange(value.filter((e) => e.uid !== uid));
    },
    [value, onChange],
  );

  const move = useCallback(
    (uid: string, dir: -1 | 1) => {
      const idx = value.findIndex((e) => e.uid === uid);
      if (idx < 0) return;
      const j = idx + dir;
      if (j < 0 || j >= value.length) return;
      const next = value.slice();
      const [it] = next.splice(idx, 1);
      next.splice(j, 0, it);
      onChange(next);
    },
    [value, onChange],
  );

  const startUpload = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        const err: PhotoEntry = {
          uid: nextUid(),
          key: null,
          publicUrl: null,
          previewUrl: URL.createObjectURL(file),
          status: "error",
          progress: 0,
          error: `Too large (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB)`,
        };
        onChange([...value, err]);
        return;
      }
      const uid = nextUid();
      const previewUrl = URL.createObjectURL(file);
      const entry: PhotoEntry = {
        uid,
        key: null,
        publicUrl: null,
        previewUrl,
        status: "uploading",
        progress: 0,
      };
      onChange([...value, entry]);

      try {
        const signRes = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            contentType: file.type || "application/octet-stream",
            contentLength: file.size,
            originalName: file.name,
          }),
        });
        const sign = await signRes.json();
        if (!signRes.ok) throw new Error(sign?.error || "Could not sign upload");

        await xhrPut(sign.url, file, (pct) => updateEntry(uid, { progress: pct }));

        updateEntry(uid, {
          key: sign.key,
          publicUrl: sign.publicUrl,
          status: "done",
          progress: 100,
        });
      } catch (e) {
        updateEntry(uid, {
          status: "error",
          error: (e as Error).message || "Upload failed",
        });
      }
    },
    [onChange, scope, updateEntry, value],
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const remaining = max - value.length;
      if (remaining <= 0) return;
      const list = Array.from(files).slice(0, remaining);
      // Sequential to keep memory + UI pressure low; parallel makes the
      // progress bar dance and confuses users on slow connections.
      void (async () => {
        for (const f of list) {
          await startUpload(f);
        }
      })();
    },
    [max, value.length, startUpload],
  );

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
        className={[
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition",
          dragOver ? "border-primary-500 bg-primary-50" : "border-surface-300 hover:border-surface-400 bg-surface-50",
        ].join(" ")}
        data-testid="photo-uploader-dropzone"
      >
        <ImagePlus className="h-6 w-6 text-surface-500" />
        <div className="text-sm font-medium text-surface-700">
          {value.length >= max
            ? `Maximum ${max} photos`
            : <>Drop photos or <span className="text-primary-700 underline">browse</span></>}
        </div>
        <div className="text-xs text-surface-500">
          JPEG, PNG, WebP, or HEIC. Up to {Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB each.
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = ""; // allow re-selecting same file
          }}
        />
      </div>

      {value.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" data-testid="photo-uploader-list">
          {value.map((entry, idx) => (
            <li
              key={entry.uid}
              className="group relative aspect-square overflow-hidden rounded-md border border-surface-200 bg-surface-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.publicUrl || entry.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />

              {entry.status === "uploading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <div className="h-1 w-3/4 overflow-hidden rounded bg-white/30">
                    <div className="h-full bg-white" style={{ width: `${entry.progress}%` }} />
                  </div>
                </div>
              )}

              {entry.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-error-700/80 p-2 text-center text-xs text-white">
                  <span className="font-semibold">Upload failed</span>
                  <span className="line-clamp-3">{entry.error}</span>
                </div>
              )}

              {entry.status === "done" && idx === 0 && (
                <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Cover
                </span>
              )}

              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); move(entry.uid, -1); }}
                  disabled={idx === 0}
                  className="rounded bg-black/60 p-1 text-white disabled:opacity-30"
                  aria-label="Move earlier"
                  title="Move earlier"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); move(entry.uid, 1); }}
                  disabled={idx === value.length - 1}
                  className="rounded bg-black/60 p-1 text-white disabled:opacity-30"
                  aria-label="Move later"
                  title="Move later"
                >
                  <GripVertical className="h-3.5 w-3.5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeEntry(entry.uid); }}
                  className="rounded bg-black/60 p-1 text-white"
                  aria-label="Remove"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function xhrPut(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}
