"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAltadefinizioneStreams = getAltadefinizioneStreams;
const cheerio = require("cheerio");
const proxy_1 = require("./proxy");
const ALTA_BASE = 'https://altadefinizionegratis.center';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
function normalizeTitle(input) {
    return input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function scoreTitle(target, candidate) {
    const t = normalizeTitle(target);
    const c = normalizeTitle(candidate);
    if (!t || !c)
        return 0;
    if (t === c)
        return 100;
    if (c.includes(t))
        return 90;
    if (t.includes(c))
        return 85;
    const tWords = t.split(' ');
    let overlap = 0;
    for (const w of tWords) {
        if (w && c.includes(w))
            overlap++;
    }
    return Math.round((overlap / Math.max(1, tWords.length)) * 70);
}
async function fetchText(url, referer) {
    const headers = {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': referer || `${ALTA_BASE}/`
    };
    const resp = await fetch(url, { headers });
    if (!resp.ok)
        throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
}
function absolutize(baseUrl, candidate) {
    try {
        return new URL(candidate, baseUrl).toString();
    }
    catch {
        return candidate;
    }
}
function pickPlayableFromHtml(html, pageUrl) {
    const hls = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i)?.[0];
    if (hls)
        return hls.replace(/\\\//g, '/');
    const mp4 = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/i)?.[0];
    if (mp4)
        return mp4.replace(/\\\//g, '/');
    const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1];
    if (iframeMatch)
        return absolutize(pageUrl, iframeMatch);
    return null;
}
async function resolvePlayableUrl(url, maxDepth = 3) {
    let current = url;
    for (let i = 0; i < maxDepth; i++) {
        let html;
        try {
            html = await fetchText(current, i === 0 ? `${ALTA_BASE}/` : current);
        }
        catch {
            return null;
        }
        const found = pickPlayableFromHtml(html, current);
        if (!found)
            return null;
        if (/\.m3u8(\?|$)/i.test(found) || /\.mp4(\?|$)/i.test(found))
            return found;
        current = found;
    }
    return null;
}
async function getMovieTitleFromTmdb(tmdbId) {
    const key = Buffer.from('MTg2NWY0M2EwNTQ5Y2E1MGQzNDFkZDlhYjhiMjlmNDk=', 'base64').toString();
    let title = '';
    if (tmdbId.startsWith('tt')) {
        const res = await fetch(`https://api.themoviedb.org/3/find/${tmdbId}?api_key=${key}&external_source=imdb_id&language=it`);
        if (!res.ok)
            return null;
        const data = await res.json();
        title = data?.movie_results?.[0]?.title || '';
    }
    else {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}&language=it`);
        if (!res.ok)
            return null;
        const data = await res.json();
        title = data?.title || '';
    }
    return title || null;
}
async function searchAltadefinizionePage(title) {
    const searchUrl = `${ALTA_BASE}/?do=search&subaction=search&story=${encodeURIComponent(title)}`;
    const html = await fetchText(searchUrl);
    const $ = cheerio.load(html);
    const candidates = [];
    $('div.box').each((_i, el) => {
        const anchor = $(el).find('a[href]').first();
        const imgAlt = $(el).find('img').attr('alt') || '';
        const href = anchor.attr('href') || '';
        if (!href)
            return;
        const abs = absolutize(ALTA_BASE, href);
        const candidateTitle = imgAlt || anchor.text() || '';
        const score = scoreTitle(title, candidateTitle);
        candidates.push({ url: abs, title: candidateTitle, score });
    });
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best || best.score < 35)
        return null;
    return best.url;
}
async function extractMirrorCandidates(pageUrl) {
    const html = await fetchText(pageUrl);
    const $ = cheerio.load(html);
    const urls = [];
    const inputMirror = $('input[data-mirror]').last().attr('value');
    if (inputMirror)
        urls.push(absolutize(pageUrl, inputMirror));
    $('#mirrors li a').each((_i, el) => {
        const u = $(el).attr('data-target');
        if (u)
            urls.push(absolutize(pageUrl, u));
    });
    $('.guardahd-player iframe').each((_i, el) => {
        const u = $(el).attr('src');
        if (u)
            urls.push(absolutize(pageUrl, u));
    });
    // Keep order, remove duplicates
    return [...new Set(urls.filter(Boolean))];
}
async function getAltadefinizioneStreams(tmdbId) {
    try {
        const tmdbTitle = await getMovieTitleFromTmdb(tmdbId);
        if (!tmdbTitle)
            return [];
        const pageUrl = await searchAltadefinizionePage(tmdbTitle);
        if (!pageUrl)
            return [];
        const candidates = await extractMirrorCandidates(pageUrl);
        const streams = [];
        for (const candidate of candidates.slice(0, 4)) {
            const resolved = await resolvePlayableUrl(candidate);
            if (!resolved)
                continue;
            const headers = {
                'User-Agent': UA,
                'Referer': pageUrl,
                'Origin': ALTA_BASE
            };
            if (/\.m3u8(\?|$)/i.test(resolved)) {
                const token = (0, proxy_1.makeProxyToken)(resolved, headers);
                streams.push({
                    name: 'Altadefinizione 🤌',
                    title: `🎬 ${tmdbTitle}`,
                    url: `/proxy/hls/manifest.m3u8?token=${token}`
                });
            }
            else {
                streams.push({
                    name: 'Altadefinizione 🤌',
                    title: `🎬 ${tmdbTitle}`,
                    url: resolved
                });
            }
        }
        // De-duplicate by final URL
        const seen = new Set();
        return streams.filter((s) => {
            if (seen.has(s.url))
                return false;
            seen.add(s.url);
            return true;
        });
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=altadefinizione.js.map