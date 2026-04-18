"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAniPlayStreams = getAniPlayStreams;
function normalizeTitle(input) {
    return input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function scoreTitleMatch(query, candidate) {
    const q = normalizeTitle(query);
    const c = normalizeTitle(candidate);
    if (!q || !c)
        return 0;
    if (q === c)
        return 100;
    if (c.startsWith(q))
        return 90;
    if (c.includes(q))
        return 80;
    const qWords = q.split(' ');
    const cWords = c.split(' ');
    let overlap = 0;
    for (const w of qWords) {
        if (cWords.includes(w))
            overlap++;
    }
    return Math.round((overlap / qWords.length) * 70);
}
async function fetchJsonWithTimeout(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok)
            return null;
        return await resp.json();
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timeout);
    }
}
async function getKitsuPreferredTitle(kitsuId) {
    const data = await fetchJsonWithTimeout(`https://kitsu.io/api/edge/anime/${encodeURIComponent(kitsuId)}`);
    const attrs = data?.data?.attributes;
    if (!attrs)
        return null;
    return attrs?.canonicalTitle
        || attrs?.titles?.en_jp
        || attrs?.titles?.en
        || attrs?.titles?.ja_jp
        || null;
}
function flattenAniPlayEpisodes(anime) {
    const episodes = [];
    if (Array.isArray(anime?.episodes)) {
        for (const ep of anime.episodes) {
            if (typeof ep?.id === 'number' && typeof ep?.episodeNumber === 'string') {
                episodes.push({ id: ep.id, episodeNumber: ep.episodeNumber, title: ep?.title });
            }
        }
    }
    return episodes;
}
async function resolveAniPlayAnimeIdByTitle(title) {
    const q = encodeURIComponent(title);
    const quick = await fetchJsonWithTimeout(`https://aniplay.co/api/anime/search?query=${q}`);
    const candidates = Array.isArray(quick) ? quick : [];
    if (candidates.length === 0)
        return null;
    let best = null;
    let bestScore = -1;
    for (const c of candidates) {
        const name = typeof c?.title === 'string' ? c.title : '';
        const score = scoreTitleMatch(title, name);
        if (score > bestScore) {
            best = c;
            bestScore = score;
        }
    }
    if (!best || typeof best?.id !== 'number')
        return null;
    if (bestScore < 40)
        return null;
    return best.id;
}
async function resolveAniPlayEpisodeVideoUrl(animeId, episodeNum) {
    const anime = await fetchJsonWithTimeout(`https://aniplay.co/api/anime/${animeId}`);
    if (!anime)
        return null;
    const episodes = flattenAniPlayEpisodes(anime);
    const wanted = episodes.find((ep) => ep.episodeNumber === episodeNum) || episodes[0];
    if (!wanted)
        return null;
    const epInfo = await fetchJsonWithTimeout(`https://aniplay.co/api/episode/${wanted.id}`);
    const url = epInfo?.videoUrl;
    if (typeof url !== 'string' || !url.trim())
        return null;
    return url;
}
async function getAniPlayStreams(kitsuId, episodeNum = '1') {
    try {
        const title = await getKitsuPreferredTitle(kitsuId);
        if (!title)
            return [];
        const animeId = await resolveAniPlayAnimeIdByTitle(title);
        if (!animeId)
            return [];
        const videoUrl = await resolveAniPlayEpisodeVideoUrl(animeId, episodeNum);
        if (!videoUrl)
            return [];
        return [{
                name: 'AniPlay 🤌',
                title: `🎌 ${title} · Episode ${episodeNum}`,
                url: videoUrl,
                behaviorHints: {
                    notWebReady: false
                }
            }];
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=aniplay.js.map