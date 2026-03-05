import ngrok from "@ngrok/ngrok";

export interface TunnelStatus {
    active: boolean;
    url: string | null;
    error: string | null;
}

let listener: Awaited<ReturnType<typeof ngrok.forward>> | null = null;
let tunnelUrl: string | null = null;
let tunnelError: string | null = null;

export async function startTunnel(
    authToken: string,
    domain?: string
): Promise<TunnelStatus> {
    // Stop any existing tunnel first
    await stopTunnel();

    if (!authToken) {
        tunnelError = "No auth token provided";
        return getTunnelStatus();
    }

    try {
        const opts: Parameters<typeof ngrok.forward>[0] = {
            addr: 3000,
            authtoken: authToken,
        };
        if (domain) {
            opts.domain = domain;
        }

        listener = await ngrok.forward(opts);
        tunnelUrl = listener.url() ?? null;
        tunnelError = null;
    } catch (err) {
        tunnelUrl = null;
        tunnelError = err instanceof Error ? err.message : String(err);
        listener = null;
    }

    return getTunnelStatus();
}

export async function stopTunnel(): Promise<void> {
    if (listener) {
        try {
            await listener.close();
        } catch {
            // ignore errors on close
        }
        listener = null;
    }
    tunnelUrl = null;
    tunnelError = null;
}

export function getTunnelStatus(): TunnelStatus {
    return {
        active: listener !== null && tunnelUrl !== null,
        url: tunnelUrl,
        error: tunnelError,
    };
}
