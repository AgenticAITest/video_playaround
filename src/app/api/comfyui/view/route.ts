import { NextRequest, NextResponse } from "next/server";
import { ComfyUIClient } from "@/lib/comfyui/client";
import {
  isCached,
  readCachedFile,
  writeCachedFile,
  getContentType,
} from "@/lib/cache/file-cache";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filename = searchParams.get("filename");
  const subfolder = searchParams.get("subfolder") || undefined;
  const type = searchParams.get("type") || undefined;
  const comfyuiUrl = searchParams.get("comfyuiUrl") || "http://localhost:8188";
  const generationId = searchParams.get("generationId") || undefined;

  if (!filename) {
    return NextResponse.json(
      { error: "filename is required" },
      { status: 400 }
    );
  }

  // If generationId provided and file is cached, serve from disk
  if (generationId && isCached(generationId, filename)) {
    const data = readCachedFile(generationId, filename);
    if (data) {
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          "Content-Type": getContentType(filename),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache": "HIT",
        },
      });
    }
  }

  // Try to proxy from ComfyUI
  try {
    const client = new ComfyUIClient(comfyuiUrl);
    const response = await client.viewFile(filename, subfolder, type);

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Lazy-cache: save a local copy if generationId provided
    if (generationId) {
      try {
        writeCachedFile(generationId, filename, buffer);
      } catch {
        // Non-fatal — we still serve the proxied response
      }
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": generationId ? "MISS" : "PROXY",
      },
    });
  } catch (error) {
    // Fallback: if ComfyUI is down but we have a cached copy, serve it
    if (generationId) {
      const data = readCachedFile(generationId, filename);
      if (data) {
        return new NextResponse(new Uint8Array(data), {
          status: 200,
          headers: {
            "Content-Type": getContentType(filename),
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Cache": "FALLBACK",
          },
        });
      }
    }

    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
