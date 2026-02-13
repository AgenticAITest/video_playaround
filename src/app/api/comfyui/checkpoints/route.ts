import { NextRequest, NextResponse } from "next/server";
import { ComfyUIClient } from "@/lib/comfyui/client";

export async function GET(request: NextRequest) {
  try {
    const comfyuiUrl =
      request.nextUrl.searchParams.get("comfyuiUrl") ||
      "http://localhost:8188";

    const client = new ComfyUIClient(comfyuiUrl);
    const objectInfo = await client.getObjectInfo();

    // Extract checkpoint list from CheckpointLoaderSimple node info
    const loaderInfo = objectInfo["CheckpointLoaderSimple"] as
      | { input?: { required?: { ckpt_name?: [string[]] } } }
      | undefined;

    const checkpoints =
      loaderInfo?.input?.required?.ckpt_name?.[0] ?? [];

    return NextResponse.json({ checkpoints });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, checkpoints: [] }, { status: 500 });
  }
}
