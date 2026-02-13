import { NextRequest, NextResponse } from "next/server";
import { ComfyUIClient } from "@/lib/comfyui/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const comfyuiUrl =
      (formData.get("comfyuiUrl") as string) || "http://localhost:8188";

    if (!file) {
      return NextResponse.json(
        { error: "image file is required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const client = new ComfyUIClient(comfyuiUrl);
    const result = await client.uploadImage(buffer, file.name, true);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
