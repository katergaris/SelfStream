"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { addonBuilder } = require('stremio-addon-sdk');
const vixsrc_1 = require("./vixsrc");
const altadefinizione_1 = require("./altadefinizione");
const cb01_1 = require("./cb01");
const cinemacity_1 = require("./cinemacity");
const proxy_1 = require("./proxy");
const config_1 = require("./config");
const undici_1 = require("undici");
const promises_1 = require("stream/promises");
const express = require('express');
const landing_1 = require("./landing");
// Map subtitle label names to BCP-47 language codes for HLS LANGUAGE attribute
const LABEL_TO_LANG = {
    'arabic': 'ar', 'العربية': 'ar',
    'bulgarian': 'bg', 'български': 'bg',
    'cantonese': 'yue', '廣東話': 'yue',
    'catalan': 'ca', 'català': 'ca',
    'chinese-simplified': 'zh-Hans', '中文 (简体)': 'zh-Hans', '中文(简体)': 'zh-Hans',
    'chinese-traditional': 'zh-Hant', '中文 (繁體)': 'zh-Hant', '中文(繁體)': 'zh-Hant',
    'croatian': 'hr', 'hrvatski': 'hr',
    'czech': 'cs', 'čeština': 'cs',
    'danish': 'da', 'dansk': 'da',
    'dutch': 'nl', 'nederlands': 'nl',
    'english': 'en',
    'estonian': 'et', 'eesti': 'et',
    'filipino': 'fil',
    'finnish': 'fi', 'suomi': 'fi',
    'french': 'fr', 'français': 'fr',
    'galician': 'gl', 'galego': 'gl',
    'german': 'de', 'deutsch': 'de',
    'greek': 'el', 'ελληνικά': 'el',
    'hebrew': 'he', 'עברית': 'he',
    'hindi': 'hi', 'हिन्दी': 'hi',
    'hungarian': 'hu', 'magyar': 'hu',
    'icelandic': 'is', 'íslenska': 'is',
    'indonesian': 'id', 'bahasa indonesia': 'id',
    'italian': 'it', 'italiano': 'it',
    'japanese': 'ja', '日本語': 'ja',
    'kannada': 'kn', 'ಕನ್ನಡ': 'kn',
    'korean': 'ko', '한국어': 'ko',
    'latvian': 'lv', 'latviešu': 'lv',
    'lithuanian': 'lt', 'lietuvių': 'lt',
    'malay': 'ms', 'bahasa melayu': 'ms',
    'malayalam': 'ml', 'മലയാളം': 'ml',
    'norwegian': 'no', 'norsk': 'no',
    'polish': 'pl', 'polski': 'pl',
    'portuguese': 'pt', 'português': 'pt',
    'romanian': 'ro', 'română': 'ro',
    'russian': 'ru', 'русский': 'ru',
    'serbian': 'sr', 'srpski': 'sr',
    'slovak': 'sk', 'slovenčina': 'sk',
    'slovenian': 'sl', 'slovenščina': 'sl',
    'spanish': 'es', 'español': 'es',
    'swedish': 'sv', 'svenska': 'sv',
    'tamil': 'ta', 'தமிழ்': 'ta',
    'telugu': 'te', 'తెలుగు': 'te',
    'thai': 'th', 'ไทย': 'th',
    'turkish': 'tr', 'türkçe': 'tr',
    'ukrainian': 'uk', 'українська': 'uk',
    'vietnamese': 'vi', 'tiếng việt': 'vi',
};
function guessLangCode(label) {
    const lower = label.toLowerCase().replace(/\s*\(.*$/, '').trim();
    if (LABEL_TO_LANG[lower])
        return LABEL_TO_LANG[lower];
    // Try matching just the first word
    const firstWord = lower.split(/[\s(-]/)[0];
    if (LABEL_TO_LANG[firstWord])
        return LABEL_TO_LANG[firstWord];
    // Check if label contains a known language name
    for (const [key, code] of Object.entries(LABEL_TO_LANG)) {
        if (lower.includes(key))
            return code;
    }
    return 'und';
}
const manifest = {
    id: 'org.selfstream.addon',
    version: '1.1.0',
    name: 'SelfStream🤌',
    description: 'SelfStream - Multi-source streaming addon',
    logo: 'https://icv.stremio.dpdns.org/prisonmike.png',
    background: 'https://blog.stremio.com/wp-content/uploads/2022/08/shino-1024x632.png',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tmdb:', 'tt'],
    catalogs: []
};
const builder = new addonBuilder(manifest);
function normalizeExternalAddonBase(rawUrl) {
    if (!rawUrl)
        return null;
    const trimmed = rawUrl.trim();
    if (!trimmed)
        return null;
    try {
        const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        const u = new URL(withProtocol);
        let path = u.pathname || '/';
        if (path.endsWith('/manifest.json')) {
            path = path.substring(0, path.length - '/manifest.json'.length) || '/';
        }
        if (!path.startsWith('/'))
            path = `/${path}`;
        if (path.length > 1 && path.endsWith('/'))
            path = path.substring(0, path.length - 1);
        return `${u.origin}${path}`;
    }
    catch {
        return null;
    }
}
async function getExternalAddonStreams(type, id, addonUrl) {
    const base = normalizeExternalAddonBase(addonUrl);
    if (!base)
        return [];
    const streamUrl = `${base}/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);
        const resp = await fetch(streamUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok)
            return [];
        const data = await resp.json();
        const streams = Array.isArray(data?.streams) ? data.streams : [];
        const cleaned = streams
            .filter((s) => s && typeof s === 'object' && (typeof s.url === 'string' || typeof s.externalUrl === 'string'))
            .map((s) => ({
            ...s,
            name: s.name ? `External · ${s.name}` : 'External · Stream',
            title: s.title || s.description || 'External stream'
        }));
        return cleaned;
    }
    catch {
        return [];
    }
}
// Stream handler that uses user config to decide which sources to query
async function handleStream(type, id, userConfig) {
    const allStreams = [];
    try {
        if (type === 'movie' || type === 'series') {
            let tmdbId = id;
            let season;
            let episode;
            if (type === 'movie') {
                if (id.startsWith('tmdb:')) {
                    tmdbId = id.split(':')[1];
                }
            }
            else if (type === 'series') {
                const parts = id.split(':');
                if (parts[0] === 'tmdb') {
                    tmdbId = parts[1];
                    season = parts[2];
                    episode = parts[3];
                }
                else if (parts[0].startsWith('tt')) {
                    tmdbId = parts[0];
                    season = parts[1];
                    episode = parts[2];
                }
            }
            // Fetch localized title from TMDB once for all sources
            let mediaTitle = '';
            try {
                const TMDB_KEY = Buffer.from('MTg2NWY0M2EwNTQ5Y2E1MGQzNDFkZDlhYjhiMjlmNDk=', 'base64').toString();
                const tmdbType = type === 'series' ? 'tv' : 'movie';
                // Pick the best lang between vix and cc (prefer whichever is enabled)
                const titleLang = userConfig.cinemacityEnabled ? userConfig.cinemacityLang
                    : userConfig.vixEnabled ? userConfig.vixLang : 'en';
                if (tmdbId.startsWith('tt')) {
                    const resp = await fetch(`https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_KEY}&external_source=imdb_id&language=${titleLang}`);
                    const data = await resp.json();
                    const r = data?.movie_results?.[0] || data?.tv_results?.[0];
                    mediaTitle = r?.title || r?.name || '';
                }
                else {
                    const resp = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_KEY}&language=${titleLang}`);
                    const data = await resp.json();
                    mediaTitle = data?.title || data?.name || '';
                }
            }
            catch { /* proceed without title */ }
            // ── VixSrc ──
            if (userConfig.vixEnabled) {
                try {
                    const vixStreams = await (0, vixsrc_1.getVixSrcStreams)(tmdbId, season, episode, userConfig.vixLang);
                    for (const s of vixStreams) {
                        s.name = 'VixSrc 🤌';
                        s.title = `🎬 ${mediaTitle || 'Stream'}`;
                    }
                    allStreams.push(...vixStreams);
                }
                catch (err) {
                    console.error("[VixSrc] error:", err);
                }
            }
            // ── CinemaCity ──
            if (userConfig.cinemacityEnabled) {
                try {
                    const ccStreams = await (0, cinemacity_1.getCinemaCityStreams)(tmdbId, type, season, episode, userConfig.cinemacityLang);
                    for (const s of ccStreams) {
                        s.name = 'CinemaCity 🤌';
                        s.title = `🎬 ${mediaTitle || 'Stream'}`;
                    }
                    allStreams.push(...ccStreams);
                }
                catch (err) {
                    console.error("[CinemaCity] error:", err);
                }
            }
            // ── Altadefinizione (movie-first source) ──
            if (userConfig.altadefinizioneEnabled && type === 'movie') {
                try {
                    const adStreams = await (0, altadefinizione_1.getAltadefinizioneStreams)(tmdbId);
                    for (const s of adStreams) {
                        s.name = 'Altadefinizione 🤌';
                        s.title = `🎬 ${mediaTitle || 'Stream'}`;
                    }
                    allStreams.push(...adStreams);
                }
                catch (err) {
                    console.error('[Altadefinizione] error:', err);
                }
            }
            // ── CB01 (movie source) ──
            if (userConfig.cb01Enabled && type === 'movie') {
                try {
                    const cb01Streams = await (0, cb01_1.getCb01Streams)(tmdbId);
                    for (const s of cb01Streams) {
                        s.name = 'CB01 🤌';
                        s.title = `🎬 ${mediaTitle || 'Stream'}`;
                    }
                    allStreams.push(...cb01Streams);
                }
                catch (err) {
                    console.error('[CB01] error:', err);
                }
            }
            // ── External Stremio Addon ──
            if (userConfig.externalEnabled && userConfig.externalAddonUrl) {
                try {
                    const externalStreams = await getExternalAddonStreams(type, id, userConfig.externalAddonUrl);
                    allStreams.push(...externalStreams);
                }
                catch (err) {
                    console.error("[ExternalAddon] error:", err);
                }
            }
        }
    }
    catch (err) {
        console.error("Handler error:", err);
    }
    return allStreams;
}
builder.defineStreamHandler(async (args) => {
    let type = args.type;
    let id = args.id;
    if (typeof type === 'object' && type.id) {
        id = type.id;
        type = type.type;
    }
    console.log("Stream request (default config):", { type, id });
    const streams = await handleStream(type, id, config_1.DEFAULT_CONFIG);
    return { streams };
});
const addonInterface = builder.getInterface();
const app = express();
app.set('trust proxy', true);
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    next();
});
// ── Landing Page ──
app.get('/', (req, res) => {
    const addonBase = (0, proxy_1.getAddonBase)(req);
    res.send((0, landing_1.generateLandingPage)(manifest, addonBase));
});
// ── Manifest (default config) ──
app.get('/manifest.json', (req, res) => {
    res.json(manifest);
});
// ── Manifest (with user config) ──
app.get('/:config/manifest.json', (req, res) => {
    res.json(manifest);
});
// ── Stream Endpoint: with user config ──
app.get('/:config/stream/:type/:id.json', async (req, res) => {
    const { config: configToken, type, id } = req.params;
    const addonBase = (0, proxy_1.getAddonBase)(req);
    const userConfig = (0, config_1.decodeConfig)(configToken);
    console.log("Stream request (configured):", { type, id, userConfig });
    try {
        const streams = await handleStream(type, id, userConfig);
        const fixed = streams.map((s) => {
            if (s.url && s.url.startsWith('/')) {
                s.url = `${addonBase}${s.url}`;
            }
            return s;
        });
        res.json({ streams: fixed });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || 'Internal Error' });
    }
});
// ── Stream Endpoint: default config (backward compat) ──
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    const addonBase = (0, proxy_1.getAddonBase)(req);
    try {
        const streams = await handleStream(type, id, config_1.DEFAULT_CONFIG);
        const fixed = streams.map((s) => {
            if (s.url && s.url.startsWith('/')) {
                s.url = `${addonBase}${s.url}`;
            }
            return s;
        });
        res.json({ streams: fixed });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || 'Internal Error' });
    }
});
// ── CinemaCity Lazy Proxy: resolves fresh CDN URL at playback time ──
app.get('/proxy/cc/manifest.m3u8', async (req, res) => {
    try {
        const token = req.query.token;
        if (!token)
            return res.status(400).send('#EXTM3U\n# Missing token');
        let decoded;
        try {
            decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
        }
        catch {
            return res.status(400).send('#EXTM3U\n# Invalid token');
        }
        const pageUrl = decoded?.page;
        if (!pageUrl)
            return res.status(400).send('#EXTM3U\n# Missing page URL');
        const season = decoded?.s || undefined;
        const episode = decoded?.e || undefined;
        const preferredLang = decoded?.lang || 'en';
        // Scrape the page NOW to get a fresh CDN URL
        const freshStream = await (0, cinemacity_1.extractFreshStreamUrl)(pageUrl, season, episode);
        if (!freshStream) {
            return res.status(502).send('#EXTM3U\n# Failed to resolve stream from CinemaCity');
        }
        const freshUrl = freshStream.url;
        const streamHeaders = freshStream.headers;
        const addonBase = (0, proxy_1.getAddonBase)(req);
        // If it's an HLS stream, fetch and rewrite it through the standard proxy
        if (freshUrl.includes('.m3u8')) {
            console.log(`[CC Proxy] Fetching HLS: ${freshUrl.substring(0, 80)}...`);
            const { body, statusCode } = await (0, undici_1.request)(freshUrl, { headers: streamHeaders });
            if (statusCode !== 200) {
                return res.status(502).send(`#EXTM3U\n# CDN error ${statusCode}`);
            }
            const text = await body.text();
            // If master playlist, pick only the best resolution variant
            if (text.includes('#EXT-X-STREAM-INF:')) {
                const lines = text.split(/\r?\n/);
                const mediaLines = [];
                const variants = [];
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.startsWith('#EXT-X-MEDIA:') && line.includes('URI=')) {
                        mediaLines.push(line);
                    }
                    else if (line.startsWith('#EXT-X-STREAM-INF:')) {
                        const nextLine = lines[i + 1];
                        if (nextLine && !nextLine.startsWith('#')) {
                            let height = 0, bandwidth = 0;
                            const hMatch = line.match(/RESOLUTION=\d+x(\d+)/i);
                            if (hMatch)
                                height = parseInt(hMatch[1], 10);
                            const bMatch = line.match(/BANDWIDTH=(\d+)/i);
                            if (bMatch)
                                bandwidth = parseInt(bMatch[1], 10);
                            variants.push({ info: line, url: nextLine.trim(), height, bandwidth });
                            i++;
                        }
                    }
                }
                // Sort by resolution desc, then bandwidth desc — pick the best
                variants.sort((a, b) => (b.height - a.height) || (b.bandwidth - a.bandwidth));
                const best = variants[0] || null;
                const result = ['#EXTM3U'];
                // Rewrite audio/subtitle media lines — set preferred language as DEFAULT
                // Find which track matches: preferred lang first, fallback to 'en', fallback to first
                let defaultIdx = -1;
                let enIdx = -1;
                for (let mi = 0; mi < mediaLines.length; mi++) {
                    const langMatch = mediaLines[mi].match(/LANGUAGE="([^"]+)"/i);
                    if (langMatch) {
                        const trackLang = langMatch[1].toLowerCase();
                        if (trackLang === preferredLang.toLowerCase() || trackLang.startsWith(preferredLang.toLowerCase())) {
                            defaultIdx = mi;
                        }
                        if (enIdx === -1 && (trackLang === 'en' || trackLang.startsWith('en'))) {
                            enIdx = mi;
                        }
                    }
                }
                if (defaultIdx === -1)
                    defaultIdx = enIdx;
                if (defaultIdx === -1 && mediaLines.length > 0)
                    defaultIdx = 0;
                for (let mi = 0; mi < mediaLines.length; mi++) {
                    let ml = mediaLines[mi];
                    // Rewrite URI
                    ml = ml.replace(/URI="([^"]+)"/, (_m, uri) => {
                        const absUri = (0, proxy_1.resolveUrl)(freshUrl, uri);
                        const segToken = (0, proxy_1.makeProxyToken)(absUri, streamHeaders, 30 * 60 * 1000);
                        return `URI="${addonBase}/proxy/hls/manifest.m3u8?token=${segToken}"`;
                    });
                    // Set DEFAULT/AUTOSELECT on preferred track
                    if (mi === defaultIdx) {
                        ml = ml.replace(/DEFAULT=NO/i, 'DEFAULT=YES').replace(/AUTOSELECT=NO/i, 'AUTOSELECT=YES');
                    }
                    else {
                        ml = ml.replace(/DEFAULT=YES/i, 'DEFAULT=NO').replace(/AUTOSELECT=YES/i, 'AUTOSELECT=NO');
                    }
                    result.push(ml);
                }
                // Only include the best variant
                if (best) {
                    const absUrl = (0, proxy_1.resolveUrl)(freshUrl, best.url);
                    const variantToken = (0, proxy_1.makeProxyToken)(absUrl, streamHeaders, 30 * 60 * 1000);
                    // Add SUBTITLES group ref if we have subtitles
                    const subtitles = freshStream.subtitles || [];
                    let variantInfo = best.info;
                    if (subtitles.length > 0) {
                        variantInfo = variantInfo.replace(/\r?\n?$/, '') + ',SUBTITLES="subs0"';
                    }
                    result.push(variantInfo);
                    result.push(`${addonBase}/proxy/hls/manifest.m3u8?token=${variantToken}`);
                    console.log(`[CC Proxy] Best variant: ${best.height}p, ${best.bandwidth}bps`);
                    // Inject VTT subtitle tracks as EXT-X-MEDIA TYPE=SUBTITLES
                    if (subtitles.length > 0) {
                        console.log(`[CC Proxy] Injecting ${subtitles.length} subtitle tracks`);
                        // Find preferred subtitle — no fallback: if not found, all subs stay DEFAULT=NO
                        let defaultSubIdx = -1;
                        for (let si = 0; si < subtitles.length; si++) {
                            const subLabel = subtitles[si].label.toLowerCase();
                            if (subLabel.includes(preferredLang.toLowerCase())) {
                                if (defaultSubIdx === -1)
                                    defaultSubIdx = si;
                            }
                        }
                        for (let si = 0; si < subtitles.length; si++) {
                            const sub = subtitles[si];
                            const subToken = (0, proxy_1.makeProxyToken)(sub.url, streamHeaders, 30 * 60 * 1000);
                            const isDefault = si === defaultSubIdx;
                            const langCode = guessLangCode(sub.label);
                            result.push(`#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs0",NAME="${sub.label}",LANGUAGE="${langCode}",DEFAULT=${isDefault ? 'YES' : 'NO'},AUTOSELECT=${isDefault ? 'YES' : 'NO'},FORCED=NO,URI="${addonBase}/proxy/hls/subtitle.m3u8?token=${subToken}"`);
                        }
                    }
                }
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                res.setHeader('Cache-Control', 'no-store');
                return res.send(result.join('\n'));
            }
            // Media playlist: rewrite segments
            const lines = text.split(/\r?\n/);
            const result = [];
            for (const line of lines) {
                if ((line.includes('#EXT-X-KEY:') || line.includes('#EXT-X-MAP:')) && line.includes('URI=')) {
                    const rewritten = line.replace(/URI="([^"]+)"/g, (_m, uri) => {
                        const absUri = (0, proxy_1.resolveUrl)(freshUrl, uri);
                        const segToken = (0, proxy_1.makeProxyToken)(absUri, streamHeaders, 30 * 60 * 1000);
                        return `URI="${addonBase}/proxy/hls/segment.ts?token=${segToken}"`;
                    });
                    result.push(rewritten);
                }
                else if (!line.startsWith('#') && line.trim()) {
                    const absUrl = (0, proxy_1.resolveUrl)(freshUrl, line.trim());
                    const segToken = (0, proxy_1.makeProxyToken)(absUrl, streamHeaders, 30 * 60 * 1000);
                    result.push(`${addonBase}/proxy/hls/segment.ts?token=${segToken}`);
                }
                else {
                    result.push(line);
                }
            }
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Cache-Control', 'no-store');
            return res.send(result.join('\n'));
        }
        // MP4 — redirect directly
        return res.redirect(302, freshUrl);
    }
    catch (e) {
        console.error('[CC Proxy] error:', e?.message || e);
        res.status(500).send('#EXTM3U\n# Internal error');
    }
});
// ── HLS Proxy: Master manifest rewriter (Synthetic FHD logic) ──
app.get('/proxy/hls/manifest.m3u8', async (req, res) => {
    try {
        const token = req.query.token;
        if (!token)
            return res.status(400).send('#EXTM3U\n# Missing token');
        const decoded = (0, proxy_1.decodeProxyToken)(token);
        if (!decoded)
            return res.status(400).send('#EXTM3U\n# Invalid token');
        const upstream = decoded.u;
        const headers = decoded.h || {};
        const expire = decoded.e || 0;
        if (!upstream)
            return res.status(400).send('#EXTM3U\n# Missing upstream URL');
        if (expire && Date.now() > expire)
            return res.status(410).send('#EXTM3U\n# Token expired');
        console.log(`[HLS Proxy] Fetching: ${upstream.substring(0, 100)}...`);
        const { body, statusCode } = await (0, undici_1.request)(upstream, { headers });
        if (statusCode !== 200) {
            return res.status(502).send(`#EXTM3U\n# Upstream error ${statusCode}`);
        }
        const text = await body.text();
        const addonBase = (0, proxy_1.getAddonBase)(req);
        // If it's a master playlist, filter for the best video quality
        if (text.includes('#EXT-X-STREAM-INF:')) {
            const lines = text.split(/\r?\n/);
            const variants = [];
            const mediaLines = [];
            const otherTags = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.startsWith('#EXT-X-MEDIA:')) {
                    mediaLines.push(line);
                }
                else if (line.startsWith('#EXT-X-STREAM-INF:')) {
                    const nextLine = lines[i + 1];
                    if (nextLine && !nextLine.startsWith('#')) {
                        // Extract height and bandwidth
                        let height = 0;
                        let bandwidth = 0;
                        const hMatch = line.match(/RESOLUTION=\d+x(\d+)/i);
                        if (hMatch)
                            height = parseInt(hMatch[1], 10);
                        const bMatch = line.match(/BANDWIDTH=(\d+)/i);
                        if (bMatch)
                            bandwidth = parseInt(bMatch[1], 10);
                        variants.push({
                            info: line,
                            url: (0, proxy_1.resolveUrl)(upstream, nextLine.trim()),
                            height,
                            bandwidth
                        });
                        i++; // skip original URL line
                    }
                }
                else if (line.startsWith('#') && !line.startsWith('#EXTINF')) {
                    if (line === '#EXTM3U')
                        continue;
                    otherTags.push(line);
                }
            }
            if (variants.length > 0) {
                // Sort by resolution then bandwidth
                variants.sort((a, b) => (b.height - a.height) || (b.bandwidth - a.bandwidth));
                const best = variants[0];
                const result = ['#EXTM3U'];
                for (const tag of otherTags)
                    result.push(tag);
                // Rewrite media lines (audio/subs)
                for (const ml of mediaLines) {
                    const rewritten = ml.replace(/URI="([^"]+)"/, (_match, uri) => {
                        const absUri = (0, proxy_1.resolveUrl)(upstream, uri);
                        const segToken = (0, proxy_1.makeProxyToken)(absUri, headers);
                        return `URI="${addonBase}/proxy/hls/manifest.m3u8?token=${segToken}"`;
                    });
                    result.push(rewritten);
                }
                // Add the best variant
                const bestToken = (0, proxy_1.makeProxyToken)(best.url, headers);
                result.push(best.info);
                result.push(`${addonBase}/proxy/hls/manifest.m3u8?token=${bestToken}`);
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                res.setHeader('Cache-Control', 'no-store');
                return res.send(result.join('\n'));
            }
        }
        // Media playlist or fallback (if no variants found): rewrite segment URLs
        const lines = text.split(/\r?\n/);
        const result = [];
        for (const line of lines) {
            if ((line.includes('#EXT-X-KEY:') || line.includes('#EXT-X-MAP:')) && line.includes('URI=')) {
                const rewritten = line.replace(/URI="([^"]+)"/g, (_match, uri) => {
                    const absUri = (0, proxy_1.resolveUrl)(upstream, uri);
                    const segToken = (0, proxy_1.makeProxyToken)(absUri, headers);
                    return `URI="${addonBase}/proxy/hls/segment.ts?token=${segToken}"`;
                });
                result.push(rewritten);
            }
            else if (!line.startsWith('#') && line.trim()) {
                const absUrl = (0, proxy_1.resolveUrl)(upstream, line.trim());
                const segToken = (0, proxy_1.makeProxyToken)(absUrl, headers);
                result.push(`${addonBase}/proxy/hls/segment.ts?token=${segToken}`);
            }
            else {
                result.push(line);
            }
        }
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(result.join('\n'));
    }
    catch (e) {
        console.error('[HLS Proxy] error:', e?.message || e);
        res.status(500).send('#EXTM3U\n# Internal error');
    }
});
/**
 * Some providers prepend a fake 8-byte PNG signature to TS segments.
 * Strip it only when bytes after the header still match TS sync markers.
 */
function stripFakePngHeader(content) {
    const pngSig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (content.length <= 8 || !content.subarray(0, 8).equals(pngSig)) {
        return content;
    }
    const tsPayload = content.subarray(8);
    // MPEG-TS sync byte is 0x47
    if (tsPayload.length === 0 || tsPayload[0] !== 0x47) {
        return content;
    }
    if (tsPayload.length > 188 && tsPayload[188] !== 0x47) {
        return content;
    }
    console.log(`[HLS Proxy] Removed fake PNG header from TS segment (${content.length} -> ${tsPayload.length} bytes)`);
    return tsPayload;
}
// ── HLS Proxy: segment proxy (streaming with backpressure) ──
app.get('/proxy/hls/segment.ts', async (req, res) => {
    try {
        const token = req.query.token;
        if (!token)
            return res.status(400).send('Missing token');
        const decoded = (0, proxy_1.decodeProxyToken)(token);
        if (!decoded)
            return res.status(400).send('Invalid token');
        const upstream = decoded.u;
        const headers = decoded.h || {};
        if (!upstream)
            return res.status(400).send('Missing upstream URL');
        const { body, statusCode, headers: respHeaders } = await (0, undici_1.request)(upstream, { headers });
        if (statusCode !== 200) {
            return res.status(statusCode || 502).send('Upstream error');
        }
        const contentType = respHeaders['content-type'] || 'video/mp2t';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        // Stream with proper backpressure: CDN → player
        await (0, promises_1.pipeline)(body, res);
    }
    catch (e) {
        // AbortError / ERR_STREAM_PREMATURE_CLOSE = player disconnected, not a real error
        if (e?.code === 'ERR_STREAM_PREMATURE_CLOSE' || e?.name === 'AbortError')
            return;
        console.error('[HLS Segment Proxy] error:', e?.message || e);
        if (!res.headersSent) {
            res.status(500).send('Internal error');
        }
    }
});
// Subtitle m3u8 wrapper — HLS requires subtitles as a media playlist, not raw VTT
app.get('/proxy/hls/subtitle.m3u8', async (req, res) => {
    try {
        const token = req.query.token;
        if (!token)
            return res.status(400).send('#EXTM3U\n# Missing token');
        const addonBase = (0, proxy_1.getAddonBase)(req);
        // Return a simple HLS media playlist that references the VTT file
        const playlist = [
            '#EXTM3U',
            '#EXT-X-TARGETDURATION:86400',
            '#EXT-X-VERSION:3',
            '#EXT-X-MEDIA-SEQUENCE:0',
            '#EXT-X-PLAYLIST-TYPE:VOD',
            `#EXTINF:86400.0,`,
            `${addonBase}/proxy/hls/subtitle.vtt?token=${token}`,
            '#EXT-X-ENDLIST'
        ].join('\n');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(playlist);
    }
    catch (e) {
        console.error('[Subtitle m3u8] error:', e?.message || e);
        if (!res.headersSent)
            res.status(500).send('#EXTM3U\n# Internal error');
    }
});
// VTT subtitle proxy — fetches remote VTT, injects X-TIMESTAMP-MAP for HLS sync
app.get('/proxy/hls/subtitle.vtt', async (req, res) => {
    try {
        const token = req.query.token;
        if (!token)
            return res.status(400).send('Missing token');
        const decoded = (0, proxy_1.decodeProxyToken)(token);
        if (!decoded)
            return res.status(400).send('Invalid token');
        const upstream = decoded.u;
        const headers = decoded.h || {};
        if (!upstream)
            return res.status(400).send('Missing upstream URL');
        const { body, statusCode } = await (0, undici_1.request)(upstream, { headers });
        if (statusCode !== 200) {
            return res.status(statusCode || 502).send('Upstream error');
        }
        // Read full VTT and inject X-TIMESTAMP-MAP for HLS synchronization
        let vttText = await body.text();
        if (vttText.startsWith('WEBVTT') && !vttText.includes('X-TIMESTAMP-MAP')) {
            vttText = vttText.replace(/^WEBVTT([ \t]*[^\r\n]*)?([\r\n]+)/, 'WEBVTT$1$2X-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000$2');
        }
        res.setHeader('Content-Type', 'text/vtt');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(vttText);
    }
    catch (e) {
        if (e?.code === 'ERR_STREAM_PREMATURE_CLOSE' || e?.name === 'AbortError')
            return;
        console.error('[VTT Proxy] error:', e?.message || e);
        if (!res.headersSent) {
            res.status(500).send('Internal error');
        }
    }
});
exports.default = app;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const port = process.env.PORT || 7000;
    app.listen(port, () => {
        console.log(`SelfStream running at http://127.0.0.1:${port}`);
        console.log(`Manifest: http://127.0.0.1:${port}/manifest.json`);
    });
}
//# sourceMappingURL=addon.js.map