#!/usr/bin/env node
/**
 * Batch-generate travel souvenir badge images (travel_badge mode) via OpenRouter / Gemini.
 * Writes PNGs under 场景/generated/badges/<poolKey>/ and updates 场景/generated/badges/manifest.json
 *
 * Env: OPENROUTER_API_KEY (required), OPENROUTER_IMAGE_MODEL (optional, default google/gemini-2.5-flash-image)
 *      HTTPS_PROXY / HTTP_PROXY — also applied to direct OpenRouter calls (same as --base-url), helps if Gemini returns 403 in your region
 *
 * 本机直连 OpenRouter：在项目根目录放 `.env.local` 或 `.env`，写入 OPENROUTER_API_KEY。
 * 若 Gemini 报 403 地区不可用，先在终端 export HTTPS_PROXY（Clash 等请用 HTTP 代理端口，如 http://127.0.0.1:7890），再执行本脚本；勿设 SOCKS 到 NODE（需 HTTP 代理 URI）。
 *
 * Usage:
 *   node scripts/batch-generate-travel-badges.mjs [--seeds path/to.json] [--limit N] [--place 深圳] [--landmark "平安金融中心"] [--ref path/to/style.png] [--base-url http://localhost:3000]
 *
 * 试生成 1 张（不必改 JSON）： --limit 1
 * 或指定地点（覆盖 seeds，仅生成这一条）： --place 北京 --landmark "天坛祈年殿"
 * If --base-url is set, calls POST {base-url}/api/generate-image instead of OpenRouter directly.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = resolve(ROOT, '场景/generated/badges/manifest.json');
const BADGES_ROOT = resolve(ROOT, '场景/generated/badges');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const BATCH_SIZE = 10;
const BETWEEN_BATCH_MS = 2500;
const MAX_REFERENCE_DATA_URL_LEN = 6 * 1024 * 1024;

function loadEnvFile(p) {
    if (!existsSync(p)) return;
    const txt = readFileSync(p, 'utf8');
    for (const line of txt.split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!m) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (!process.env[m[1]]) process.env[m[1]] = v;
    }
}

function parseArgs(argv) {
    const out = {
        seeds: resolve(ROOT, 'scripts/badge-seeds.sample.json'),
        ref: null,
        baseUrl: null,
        limit: null,
        place: null,
        landmark: null
    };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--seeds' && argv[i + 1]) {
            out.seeds = resolve(process.cwd(), argv[++i]);
        } else if (argv[i] === '--ref' && argv[i + 1]) {
            out.ref = resolve(process.cwd(), argv[++i]);
        } else if (argv[i] === '--base-url' && argv[i + 1]) {
            out.baseUrl = argv[++i].replace(/\/$/, '');
        } else if (argv[i] === '--limit' && argv[i + 1]) {
            const n = parseInt(argv[++i], 10);
            out.limit = Number.isFinite(n) && n > 0 ? n : null;
        } else if (argv[i] === '--place' && argv[i + 1]) {
            out.place = String(argv[++i]).trim();
        } else if (argv[i] === '--landmark' && argv[i + 1]) {
            out.landmark = String(argv[++i]).trim();
        }
    }
    return out;
}

function slug(s) {
    return String(s || '')
        .replace(/\s+/g, '-')
        .replace(/[·／/\\:*?"<>|]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80) || 'item';
}

function dataUrlFromPngPath(filePath) {
    const buf = readFileSync(filePath);
    const b64 = buf.toString('base64');
    return `data:image/png;base64,${b64}`;
}

function extractImageUrl(data) {
    const message = data.choices && data.choices[0] && data.choices[0].message;
    if (!message) return null;
    if (message.images && message.images.length > 0) {
        const firstImage = message.images[0];
        if (typeof firstImage === 'string') return firstImage;
        if (firstImage.url) return firstImage.url;
        if (firstImage.imageUrl && firstImage.imageUrl.url) return firstImage.imageUrl.url;
        if (firstImage.image_url && firstImage.image_url.url) return firstImage.image_url.url;
        if (firstImage.b64_json) return `data:image/png;base64,${firstImage.b64_json}`;
    }
    if (Array.isArray(message.content)) {
        for (const part of message.content) {
            if (part.type === 'image_url' && part.image_url && part.image_url.url) return part.image_url.url;
            if (part.type === 'image' && (part.image_url || part.url)) {
                return (part.image_url && part.image_url.url) || part.url;
            }
        }
    }
    if (typeof message.content === 'string') {
        const content = message.content;
        const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
        if (mdMatch && mdMatch[1]) return mdMatch[1];
        if (content.startsWith('http') || content.startsWith('data:')) return content.trim();
    }
    return null;
}

function dataUrlToPngBuffer(dataUrl) {
    const m = String(dataUrl).match(/^data:image\/(\w+);base64,(.+)$/);
    if (!m) return null;
    return Buffer.from(m[2], 'base64');
}

function openRouterImageModalities(model) {
    const m = String(model || '');
    if (/black-forest-labs\/flux|\/flux\./i.test(m)) return ['image'];
    return ['image', 'text'];
}

async function generateViaOpenRouter(apiKey, model, prompt, badgePlace, refDataUrl) {
    const badgePlaceTrim = String(badgePlace || '').trim();
    const styleReferenceInstruction = refDataUrl
        ? 'The attached reference image shows the target illustration style (linework, coloring, sticker/badge composition). Match that style closely. If the user text names a different city or landmark than the reference picture, draw the new landmark in this style—do not copy the reference landmark. '
        : '';
    const place = badgePlaceTrim || '（地点）';
    const prefix =
        'Travel souvenir badge / sticker on pure white background. Hand-drawn digital doodle, loose sketchy dark outlines, soft watercolor-like washes, playful travel-journal aesthetic. One simplified iconic landmark as the main subject; small decorative motifs (clouds, stars, leaves) allowed. ' +
        'TEXT RULE: Only a decorative ribbon or banner at the bottom may contain handwritten Chinese characters for this exact place name: 「' +
        place +
        '」. No other text anywhere — no English, no extra labels, no shop signs on buildings, no watermarks. ' +
        styleReferenceInstruction;

    const finalPrompt = prefix + prompt;
    const userContent = [{ type: 'text', text: finalPrompt }];
    if (refDataUrl) {
        userContent.push({ type: 'image_url', image_url: { url: refDataUrl } });
    }

    const init = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-Title': 'SoulGo Travel Badge Batch'
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: userContent }],
            modalities: openRouterImageModalities(model)
        })
    };
    const disp = await getVercelApiDispatcher();
    if (disp) init.dispatcher = disp;
    const res = await fetch(OPENROUTER_URL, init);
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 500)}`);
    }
    const data = await res.json();
    return extractImageUrl(data);
}

function formatFetchError(e) {
    if (!e) return '';
    const parts = [e.message || String(e)];
    let c = e.cause;
    let depth = 0;
    while (c && depth < 5) {
        const msg = c.message || c.code || String(c);
        if (msg) parts.push(`cause: ${msg}`);
        c = c.cause;
        depth++;
    }
    return parts.join(' · ');
}

const API_FETCH_TIMEOUT_MS = 180000;
/** Undici 默认 TCP 连接超时约 10s；国内访问 Vercel 常需更长或走代理 */
const API_CONNECT_TIMEOUT_MS = 120000;

/**
 * Node 自带 fetch（undici）默认不会读取 HTTPS_PROXY / HTTP_PROXY，直连会在国内超时。
 * 若环境变量里配置了代理，必须用 undici 的 ProxyAgent 才会走 Clash 等 HTTP 代理。
 */
let vercelApiDispatcherCache;
async function getVercelApiDispatcher() {
    if (vercelApiDispatcherCache !== undefined) {
        return vercelApiDispatcherCache === false ? null : vercelApiDispatcherCache;
    }
    let undiciMod = null;
    try {
        undiciMod = await import('undici');
    } catch {
        try {
            undiciMod = await import('node:undici');
        } catch {
            vercelApiDispatcherCache = false;
            return null;
        }
    }
    const { Agent, ProxyAgent } = undiciMod;
    if (!Agent) {
        vercelApiDispatcherCache = false;
        return null;
    }
    const baseOpts = {
        connect: { timeout: API_CONNECT_TIMEOUT_MS },
        headersTimeout: API_FETCH_TIMEOUT_MS,
        bodyTimeout: API_FETCH_TIMEOUT_MS
    };
    const proxyRaw =
        process.env.HTTPS_PROXY ||
        process.env.https_proxy ||
        process.env.HTTP_PROXY ||
        process.env.http_proxy ||
        process.env.ALL_PROXY ||
        process.env.all_proxy ||
        '';
    const proxyUri = String(proxyRaw).trim();
    try {
        if (proxyUri && /^https?:\/\//i.test(proxyUri) && ProxyAgent) {
            vercelApiDispatcherCache = new ProxyAgent({
                uri: proxyUri,
                ...baseOpts
            });
        } else {
            vercelApiDispatcherCache = new Agent(baseOpts);
        }
        return vercelApiDispatcherCache;
    } catch {
        vercelApiDispatcherCache = false;
        return null;
    }
}

async function generateViaLocalApi(baseUrl, prompt, badgePlace, refDataUrl) {
    const body = {
        prompt,
        image_mode: 'travel_badge',
        badge_place_name: badgePlace
    };
    if (refDataUrl) body.reference_image_data_url = refDataUrl;
    const url = `${String(baseUrl).replace(/\/$/, '')}/api/generate-image`;
    let res;
    try {
        const init = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        };
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            init.signal = AbortSignal.timeout(API_FETCH_TIMEOUT_MS);
        }
        const disp = await getVercelApiDispatcher();
        if (disp) init.dispatcher = disp;
        res = await fetch(url, init);
    } catch (e) {
        const detail = formatFetchError(e);
        const hasProxy = !!(process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY);
        const isConnectTimeout = /Connect Timeout|ETIMEDOUT|timeout/i.test(detail);
        let hint = '';
        if (hasProxy && isConnectTimeout) {
            hint =
                '（已设代理仍超时：确认 Clash「允许局域网连接」、端口为 HTTP 代理如 7890；socks 代理需换 HTTP 端口或配 ALL_PROXY）';
        } else if (hasProxy) {
            hint = '（检查代理是否可用：curl -x $HTTPS_PROXY -I https://soulgo-tuzi.vercel.app）';
        } else if (isConnectTimeout) {
            hint =
                '（国内直连 Vercel 常连不上或极慢：请对终端设置可用代理，例如 export HTTPS_PROXY=http://127.0.0.1:7890；或换手机热点 / 境外网络再跑）';
        }
        throw new Error(`请求 ${url} 失败: ${detail}${hint}`);
    }
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        let err = {};
        try {
            err = JSON.parse(text);
        } catch {
            /* plain text body */
        }
        throw new Error(err.message || err.error || `HTTP ${res.status} ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.image_url || null;
}

async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    loadEnvFile(resolve(ROOT, '.env.local'));
    loadEnvFile(resolve(ROOT, '.env'));

    const args = parseArgs(process.argv);
    let seeds;
    if (args.place) {
        const p = args.place;
        const lm = args.landmark || `${p}地标`;
        seeds = [
            {
                poolKey: p,
                badge_place_name: p,
                landmark_hint: lm,
                label: `${p}·试生成`,
                collectCategory: 'souvenir',
                tier: 'B',
                memoryTag: `try_${slug(p)}_${Date.now()}`,
                regionLabel: p
            }
        ];
        console.log('Using --place override (single seed):', p, lm);
    } else {
        const seedsRaw = JSON.parse(readFileSync(args.seeds, 'utf8'));
        seeds = Array.isArray(seedsRaw) ? seedsRaw : [];
    }
    if (args.limit != null) {
        seeds = seeds.slice(0, args.limit);
    }
    if (seeds.length === 0) {
        console.error('No seeds. Use --seeds file.json or --place 北京 [--landmark "…"]');
        process.exit(1);
    }

    let refDataUrl = null;
    if (args.ref && existsSync(args.ref)) {
        refDataUrl = dataUrlFromPngPath(args.ref);
        if (refDataUrl.length > MAX_REFERENCE_DATA_URL_LEN) {
            console.error('Reference image too large');
            process.exit(1);
        }
        console.log('Using style reference:', args.ref);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
    if (!args.baseUrl && !apiKey) {
        console.error('Set OPENROUTER_API_KEY or pass --base-url (vercel dev)');
        process.exit(1);
    }

    mkdirSync(BADGES_ROOT, { recursive: true });
    let manifest = [];
    if (existsSync(MANIFEST_PATH)) {
        try {
            manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
        } catch {
            manifest = [];
        }
    }
    if (!Array.isArray(manifest)) manifest = manifest.items || [];
    const existingLabels = new Set(manifest.map((e) => e && e.label).filter(Boolean));

    for (let start = 0; start < seeds.length; start += BATCH_SIZE) {
        const chunk = seeds.slice(start, start + BATCH_SIZE);
        console.log(`Batch ${start / BATCH_SIZE + 1}: ${chunk.length} images…`);

        for (let j = 0; j < chunk.length; j++) {
            const seed = chunk[j];
            const idx = start + j;
            const poolKey = String(seed.poolKey || seed.badge_place_name || 'misc').trim() || 'misc';
            const badgePlace = String(seed.badge_place_name || poolKey).trim();
            const label = String(seed.label || `${poolKey}·${seed.landmark_hint || idx}`).trim();
            if (existingLabels.has(label)) {
                console.log('Skip existing label:', label);
                continue;
            }
            const landmark = String(seed.landmark_hint || '当地地标建筑').trim();
            const prompt =
                `Focus landmark and composition: ${landmark}. ` +
                `City/region context: ${badgePlace}. ` +
                'Single square-friendly badge composition, centered subject, generous white margin, souvenir sticker look.';

            let imageUrl = null;
            let lastErr = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    if (args.baseUrl) {
                        imageUrl = await generateViaLocalApi(args.baseUrl, prompt, badgePlace, refDataUrl);
                    } else {
                        imageUrl = await generateViaOpenRouter(apiKey, model, prompt, badgePlace, refDataUrl);
                    }
                    if (imageUrl) break;
                } catch (e) {
                    lastErr = e;
                    await sleep(800 * (attempt + 1));
                }
            }
            if (!imageUrl) {
                console.error('Failed:', label, lastErr && lastErr.message);
                continue;
            }

            const buf = dataUrlToPngBuffer(imageUrl);
            if (!buf) {
                console.error('Not a base64 data URL PNG:', label);
                continue;
            }

            const dir = join(BADGES_ROOT, slug(poolKey));
            mkdirSync(dir, { recursive: true });
            const fileName = `${slug(label)}-${Date.now()}-${idx}.png`;
            const absFile = join(dir, fileName);
            writeFileSync(absFile, buf);

            const relImage = `场景/generated/badges/${slug(poolKey)}/${fileName}`.replace(/\\/g, '/');
            const entry = {
                image: relImage,
                label,
                collectCategory: seed.collectCategory || 'souvenir',
                tier: seed.tier || 'B',
                memoryTag: seed.memoryTag != null ? String(seed.memoryTag) : `gen_${slug(label)}`,
                regionLabel: seed.regionLabel != null ? String(seed.regionLabel) : poolKey,
                poolKey,
                source: 'checkin',
                intro: seed.intro || `「${label}」AIGC 纪念徽章候选，可供画师优化替换。`,
                facts: Array.isArray(seed.facts) ? seed.facts : ['批量生成 · 旅行徽章风格'],
                tags: Array.isArray(seed.tags) ? seed.tags : ['AIGC', '纪念徽章']
            };
            manifest.push(entry);
            existingLabels.add(label);
            writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
            console.log('OK', relImage);
        }

        if (start + BATCH_SIZE < seeds.length) {
            await sleep(BETWEEN_BATCH_MS);
        }
    }

    console.log('Done manifest:', MANIFEST_PATH, 'entries:', manifest.length);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
