import { NextResponse } from "next/server";
import { stopTunnel, getTunnelStatus } from "@/lib/ngrok";

export async function POST() {
    await stopTunnel();
    return NextResponse.json(getTunnelStatus());
}
