export declare const CINEMACITY_HEADERS: Record<string, string>;
/**
 * Main entry: discover streams for a TMDB ID.
 * Returns the CDN URL directly with behaviorHints so Stremio handles HLS natively.
 * No self-proxy needed — the CDN tokens are valid for hours.
 */
export declare function getCinemaCityStreams(tmdbId: string, mediaType: string, season?: string, episode?: string, preferredLang?: string): Promise<any[]>;
export interface SubtitleTrack {
    label: string;
    url: string;
}
export interface FreshStream {
    url: string;
    headers: Record<string, string>;
    subtitles: SubtitleTrack[];
}
/**
 * Extract a fresh stream URL + proper CDN headers from a CinemaCity page.
 * Called at playback time by the lazy proxy endpoint in addon.ts.
 */
export declare function extractFreshStreamUrl(pageUrl: string, season?: number, episode?: number): Promise<FreshStream | null>;
//# sourceMappingURL=cinemacity.d.ts.map