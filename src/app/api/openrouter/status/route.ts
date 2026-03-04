import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const apiKey = searchParams.get("url"); // Re-using the 'url' param name from the component for simplicity, but it's the API key

    if (!apiKey) {
        return NextResponse.json(
            { connected: false, error: "OpenRouter API key is missing" },
            { status: 400 }
        );
    }

    const start = Date.now();

    try {
        const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error((data && data.error && data.error.message) ? data.error.message : `HTTP error ${res.status}`);
        }

        const _data = await res.json();
        const end = Date.now();

        return NextResponse.json({
            connected: true,
            latency: end - start,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Connection failed";
        return NextResponse.json(
            { connected: false, error: message },
            { status: 503 }
        );
    }
}
