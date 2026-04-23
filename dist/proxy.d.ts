/**
 * HLS Proxy helpers — shared between addon.ts, vixsrc.ts, vixcloud.ts
 *
 * Uses a server-side header cache so proxy tokens stay short.
 * Without this, every segment URL embeds the full CDN URL + all headers (~1500 chars)
 * which exceeds URL length limits in many HLS players.
 */
export declare const VIXSRC_HEADERS: Record<string, string>;
export declare const VIXCLOUD_HEADERS: Record<string, string>;
export declare function makeProxyToken(url: string, headers: Record<string, string>, ttlMs?: number): string;
export declare function decodeProxyToken(token: string): {
    u: string;
    h: Record<string, string>;
    e: number;
} | null;
export declare function resolveUrl(base: string, relative: string): string;
export declare function getAddonBase(req: any): string;
//# sourceMappingURL=proxy.d.ts.map