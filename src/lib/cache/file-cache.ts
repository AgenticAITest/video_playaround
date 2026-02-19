import fs from "node:fs";
import path from "node:path";
import { ComfyUIClient } from "@/lib/comfyui/client";
import type { OutputFile } from "@/types/generation";

const CACHE_ROOT = path.join(process.cwd(), "data", "outputs");

/** Sanitised cache path for a generation's output file */
export function getCachePath(generationId: string, filename: string): string {
  return path.join(CACHE_ROOT, generationId, path.basename(filename));
}

/** Check whether a file is already cached on disk */
export function isCached(generationId: string, filename: string): boolean {
  return fs.existsSync(getCachePath(generationId, filename));
}

/** Read a cached file, or return null if it doesn't exist */
export function readCachedFile(
  generationId: string,
  filename: string
): Buffer | null {
  const p = getCachePath(generationId, filename);
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

/** Write data to the cache, creating directories as needed */
export function writeCachedFile(
  generationId: string,
  filename: string,
  data: Buffer
): void {
  const p = getCachePath(generationId, filename);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
}

/** Remove all cached files for a generation */
export function deleteCachedFiles(generationId: string): void {
  const dir = path.join(CACHE_ROOT, generationId);
  fs.rmSync(dir, { recursive: true, force: true });
}

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** Map filename extension to MIME type */
export function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

/**
 * Eagerly download and cache all output files for a completed generation.
 * Errors are logged per-file but never throw — this is fire-and-forget.
 */
export async function eagerCacheOutputFiles(
  generationId: string,
  outputFiles: OutputFile[],
  comfyuiUrl: string
): Promise<void> {
  const client = new ComfyUIClient(comfyuiUrl);

  for (const file of outputFiles) {
    try {
      if (isCached(generationId, file.filename)) continue;

      const response = await client.viewFile(
        file.filename,
        file.subfolder,
        file.type
      );
      const arrayBuffer = await response.arrayBuffer();
      writeCachedFile(generationId, file.filename, Buffer.from(arrayBuffer));
    } catch (err) {
      console.error(
        `[file-cache] Failed to cache ${file.filename} for generation ${generationId}:`,
        err
      );
    }
  }
}
