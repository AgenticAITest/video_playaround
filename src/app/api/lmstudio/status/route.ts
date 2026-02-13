import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url =
    request.nextUrl.searchParams.get("url") || "http://localhost:1234";

  try {
    const start = Date.now();
    const response = await fetch(`${url}/v1/models`, {
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    if (!response.ok) {
      return NextResponse.json(
        { connected: false, error: `HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const models = data.data?.map((m: { id: string }) => m.id) ?? [];
    return NextResponse.json({
      connected: true,
      latency,
      models,
    });
  } catch {
    return NextResponse.json(
      { connected: false, error: "LM Studio is not reachable" },
      { status: 503 }
    );
  }
}
