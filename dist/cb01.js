"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCb01Streams = getCb01Streams;
const proxy_1 = require("./proxy");
const CB01_URL = 'https://cb01.meme';
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
async function getMovieTitleFromTmdb(tmdbId) {
    const key = Buffer.from('MTg2NWY0M2EwNTQ5Y2E1MGQzNDFkZDlhYjhiMjlmNDk=', 'base64').toString();
    if (tmdbId.startsWith('tt')) {
        const res = await fetch(`https://api.themoviedb.org/3/find/${tmdbId}?api_key=${key}&external_source=imdb_id&language=it`);
        if (!res.ok)
            return null;
        const data = await res.json();
        const m = data?.movie_results?.[0];
        if (!m?.title)
            return null;
        const year = typeof m?.release_date === 'string' ? parseInt(m.release_date.substring(0, 4), 10) : undefined;
        return { title: m.title, year: Number.isFinite(year) ? year : undefined };
    }
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}&language=it`);
    if (!res.ok)
        return null;
    const data = await res.json();
    if (!data?.title)
        return null;
    const year = typeof data?.release_date === 'string' ? parseInt(data.release_date.substring(0, 4), 10) : undefined;
    return { title: data.title, year: Number.isFinite(year) ? year : undefined };
}
function extractFeedLinks(xml) {
    return [...xml.matchAll(/<link>(.*?)<\/link>/g)].map((m) => m[1]);
}
function pickBestPostLink(links, title) {
    const slug = normalizeTitle(title).replace(/\s+/g, '-');
    const candidates = links.filter((l) => l !== CB01_URL && l !== `${CB01_URL}/` && l.includes('film'));
    const strict = candidates.find((l) => normalizeTitle(l).includes(slug));
    if (strict)
        return strict;
    return candidates[0] || null;
}
function extractPostId(html) {
    return html.match(/id=["']player-option-1["'][^>]*data-post=["'](\d+)["']/i)?.[1] || null;
}
function extractEmbedAjax(jsonText) {
    const m = jsonText.match(/"embed_url"\s*:\s*"([^"]+)"/i)?.[1];
    if (!m)
        return null;
    return m.replace(/\\\//g, '/').replace('/wws.', '/v2.');
}
async function resolveFinalUrl(startUrl) {
    try {
        const resp = await fetch(startUrl, {
            redirect: 'follow',
            headers: { 'User-Agent': UA, 'Referer': `${CB01_URL}/` }
        });
        const finalUrl = resp.url;
        if (!finalUrl)
            return null;
        if (/\.m3u8(\?|$)/i.test(finalUrl) || /\.mp4(\?|$)/i.test(finalUrl))
            return finalUrl;
        const html = await resp.text();
        const hls = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i)?.[0];
        if (hls)
            return hls.replace(/\\\//g, '/');
        const mp4 = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/i)?.[0];
        if (mp4)
            return mp4.replace(/\\\//g, '/');
        return finalUrl;
    }
    catch {
        return null;
    }
}
async function getCb01Streams(tmdbId) {
    try {
        const movie = await getMovieTitleFromTmdb(tmdbId);
        if (!movie?.title)
            return [];
        const searchQuery = `${movie.title}${movie.year ? ` ${movie.year}` : ''}`;
        const feedUrl = `${CB01_URL}/search/${encodeURIComponent(searchQuery)}/feed`;
        const feedRes = await fetch(feedUrl, { headers: { 'User-Agent': UA } });
        if (!feedRes.ok)
            return [];
        const xml = await feedRes.text();
        const links = extractFeedLinks(xml);
        const postUrl = pickBestPostLink(links, movie.title);
        if (!postUrl)
            return [];
        const postRes = await fetch(postUrl, { headers: { 'User-Agent': UA, 'Referer': `${CB01_URL}/` } });
        if (!postRes.ok)
            return [];
        const postHtml = await postRes.text();
        const postId = extractPostId(postHtml);
        if (!postId)
            return [];
        const form = new URLSearchParams({
            action: 'doo_player_ajax',
            post: postId,
            nume: '1',
            type: 'movie'
        });
        const ajaxRes = await fetch(`${CB01_URL}/wp-admin/admin-ajax.php`, {
            method: 'POST',
            headers: {
                'User-Agent': UA,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': postUrl,
                'Accept': '*/*'
            },
            body: form.toString()
        });
        if (!ajaxRes.ok)
            return [];
        const ajaxText = await ajaxRes.text();
        const middleUrl = extractEmbedAjax(ajaxText);
        if (!middleUrl)
            return [];
        const finalUrl = await resolveFinalUrl(middleUrl);
        if (!finalUrl)
            return [];
        if (/\.m3u8(\?|$)/i.test(finalUrl)) {
            const token = (0, proxy_1.makeProxyToken)(finalUrl, {
                'User-Agent': UA,
                'Referer': `${CB01_URL}/`,
                'Origin': CB01_URL
            });
            return [{
                    name: 'CB01 🤌',
                    title: `🎬 ${movie.title}`,
                    url: `/proxy/hls/manifest.m3u8?token=${token}`
                }];
        }
        return [{
                name: 'CB01 🤌',
                title: `🎬 ${movie.title}`,
                url: finalUrl
            }];
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=cb01.js.map