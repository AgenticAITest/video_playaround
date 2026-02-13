import { NextRequest, NextResponse } from "next/server";
import { listGenerations, countGenerations } from "@/lib/db/generations";
import type { GenerationMode } from "@/types/generation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const mode = searchParams.get("mode") as GenerationMode | null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const generations = listGenerations({
      mode: mode || undefined,
      limit,
      offset,
    });

    const total = countGenerations(mode || undefined);

    return NextResponse.json({ generations, total, limit, offset });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
