/**
 * Security scanning for uploaded files.
 *
 * Currently:
 *  - ClamAV (clamscan / clamdscan) integration. If installed, we shell out and
 *    check the buffer via a temp file. If not installed, we SOFT-PASS and log
 *    a warning so ops can install ClamAV before exposing uploads publicly.
 *
 * Add more scanners here as you grow:
 *  - TrID / file-type detection (already partially done via mimeType validation)
 *  - Office/PDF macro stripping
 *  - SSRF/XXE guards on PDF / SVG (if you ever accept SVG — currently you don't)
 */

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export type ScanResult =
  | { clean: true; scanner: "clamav" | "none"; scannedMs: number }
  | { clean: false; reason: string; scanner: "clamav"; scannedMs: number };

const SCANNER_TIMEOUT_MS = 20_000;

export async function scanBuffer(buf: Buffer, mimeType: string, originalName?: string): Promise<ScanResult> {
  const start = Date.now();
  const clam = await pickClamscanBinary();
  if (!clam) {
    // No scanner available — soft pass with a console warning.
    if (process.env.NODE_ENV !== "test") {
       
      console.warn(
        "[security] No clamav binary found. Uploads are NOT being scanned. " +
        "Install clamav (`apt install clamav`) and ensure `clamscan` is on PATH before production."
      );
    }
    return { clean: true, scanner: "none", scannedMs: Date.now() - start };
  }

  // clamav can't read from stdin (well, clamscan can with `-`), but writing a
  // temp file is more portable across clamav versions.
  const dir = await mkdtemp(path.join(tmpdir(), "gr-scan-"));
  const file = path.join(dir, safeName(originalName) || "upload.bin");
  try {
    await writeFile(file, buf);
    const out = await runClam(clam, file);
    const ms = Date.now() - start;
    if (out.code === 0) return { clean: true, scanner: "clamav", scannedMs: ms };
    if (out.code === 1) {
      // 1 = virus found
      return { clean: false, reason: extractInfection(out.stdout, out.stderr) || "malware detected", scanner: "clamav", scannedMs: ms };
    }
    // 2 = error. Treat as soft-fail (don't block legitimate users) but log loudly.
     
    console.error(`[security] clamav error (exit ${out.code}) for ${mimeType}:`, out.stderr || out.stdout);
    return { clean: true, scanner: "clamav", scannedMs: ms };
  } catch (e) {
     
    console.error("[security] scan threw:", e);
    return { clean: true, scanner: "none", scannedMs: Date.now() - start };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function safeName(n?: string): string {
  return (n || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

async function pickClamscanBinary(): Promise<string | null> {
  // Honor explicit override
  if (process.env.CLAMAV_BINARY) return process.env.CLAMAV_BINARY;
  // Try common names. We probe at runtime, not import-time, so missing-binary
  // doesn't crash dev environments.
  for (const bin of ["clamscan", "clamdscan"]) {
    if (await which(bin)) return bin;
  }
  return null;
}

function which(bin: string): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("which", [bin], { stdio: "ignore" });
    p.on("error", () => resolve(false));
    p.on("exit", (code) => resolve(code === 0));
  });
}

function runClam(clam: string, file: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(clam, ["--no-summary", "--infected", "--stdout", file], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (b) => (stdout += b.toString()));
    p.stderr.on("data", (b) => (stderr += b.toString()));
    const t = setTimeout(() => p.kill("SIGKILL"), SCANNER_TIMEOUT_MS);
    p.on("error", (e) => {
      clearTimeout(t);
      resolve({ code: 2, stdout, stderr: (stderr || "") + `\nspawn error: ${e}` });
    });
    p.on("exit", (code) => {
      clearTimeout(t);
      resolve({ code: code ?? 2, stdout, stderr });
    });
  });
}

function extractInfection(stdout: string, stderr: string): string | null {
  const m = (stdout + "\n" + stderr).match(/(?:stream|file|stdin):\s+(.+?)\s+FOUND\b/i)
    || (stdout + "\n" + stderr).match(/FOUND\s*$/im);
  return m?.[1]?.trim() || (m ? "infection" : null);
}
