import ngrok from "@ngrok/ngrok";

// Ensure we don't start multiple listeners in Next.js development hot-reload
declare global {
    var ngrokListener: ngrok.Listener | null;
    var ngrokCurrentToken: string | null;
    var ngrokCurrentDomain: string | null;
}

if (!global.ngrokListener) {
    global.ngrokListener = null;
    global.ngrokCurrentToken = null;
    global.ngrokCurrentDomain = null;
}

export async function startTunnel(authToken: string, domain?: string): Promise<string> {
    // If we already have a tunnel with the exact same config, return it
    if (
        global.ngrokListener &&
        global.ngrokCurrentToken === authToken &&
        global.ngrokCurrentDomain === (domain || null)
    ) {
        const url = global.ngrokListener.url();
        if (url) return url;
    }

    // Stop any existing tunnel before starting a new one
    await stopTunnel();

    try {
        const builder = ngrok.forward({
            addr: 3000,
            authtoken: authToken,
            domain: domain || undefined,
        });

        const listener = await builder;
        global.ngrokListener = listener;
        global.ngrokCurrentToken = authToken;
        global.ngrokCurrentDomain = domain || null;

        const url = listener.url();
        if (!url) {
            throw new Error("Tunnel connected but no URL returned");
        }

        return url;
    } catch (error) {
        console.error("Failed to start ngrok tunnel:", error);
        throw error;
    }
}

export async function stopTunnel(): Promise<void> {
    if (global.ngrokListener) {
        try {
            await global.ngrokListener.close();
        } catch (e) {
            console.error("Error closing existing ngrok tunnel", e);
        }
        global.ngrokListener = null;
        global.ngrokCurrentToken = null;
        global.ngrokCurrentDomain = null;
    }
}

export function getTunnelStatus() {
    if (global.ngrokListener) {
        return {
            active: true,
            url: global.ngrokListener.url(),
            error: null,
        };
    }
    return {
        active: false,
        url: null,
        error: null,
    };
}
