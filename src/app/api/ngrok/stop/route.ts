import { NextResponse } from "next/server";
import { stopTunnel } from "@/lib/ngrok/manager";

export async function POST() {
    await stopTunnel();
    return NextResponse.json({ success: true });
}
