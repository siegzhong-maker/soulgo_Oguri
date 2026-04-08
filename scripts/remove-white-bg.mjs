#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const DEFAULT_INPUT = path.resolve(ROOT, '场景/generated');
const DEFAULT_OUTPUT = path.resolve(ROOT, '场景/generated/pet-home-assets');

function parseArgs(argv) {
    const out = {
        input: DEFAULT_INPUT,
        output: DEFAULT_OUTPUT,
        whiteThreshold: 245,
        feather: 20,
        maxChromaDiff: 38
    };
    for (let i = 2; i < argv.length; i++) {
        const k = argv[i];
        if (k === '--input' && argv[i + 1]) out.input = path.resolve(ROOT, argv[++i]);
        else if (k === '--output' && argv[i + 1]) out.output = path.resolve(ROOT, argv[++i]);
        else if (k === '--white-threshold' && argv[i + 1]) out.whiteThreshold = Number(argv[++i]);
        else if (k === '--feather' && argv[i + 1]) out.feather = Number(argv[++i]);
        else if (k === '--max-chroma-diff' && argv[i + 1]) out.maxChromaDiff = Number(argv[++i]);
    }
    out.whiteThreshold = Math.max(200, Math.min(255, out.whiteThreshold || 245));
    out.feather = Math.max(1, Math.min(60, out.feather || 20));
    out.maxChromaDiff = Math.max(5, Math.min(120, out.maxChromaDiff || 38));
    return out;
}

async function listImages(rootDir) {
    const files = [];
    async function walk(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const p = path.join(dir, item.name);
            if (item.isDirectory()) {
                await walk(p);
                continue;
            }
            if (!/\.(png|jpg|jpeg|webp)$/i.test(item.name)) continue;
            files.push(p);
        }
    }
    await walk(rootDir);
    return files;
}

function alphaFromWhite(r, g, b, a, threshold, feather, maxChromaDiff) {
    if (a === 0) return 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chromaDiff = max - min;
    if (chromaDiff > maxChromaDiff) return a;

    const whiteness = (r + g + b) / 3;
    const start = threshold - feather;
    if (whiteness <= start) return a;
    if (whiteness >= threshold) return 0;

    const keep = (threshold - whiteness) / feather;
    return Math.max(0, Math.min(255, Math.round(a * keep)));
}

async function processOne(src, dst, opts) {
    const img = sharp(src, { failOn: 'none' }).ensureAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.from(data);
    let changedPixels = 0;
    for (let i = 0; i < out.length; i += 4) {
        const r = out[i];
        const g = out[i + 1];
        const b = out[i + 2];
        const a = out[i + 3];
        const nextA = alphaFromWhite(r, g, b, a, opts.whiteThreshold, opts.feather, opts.maxChromaDiff);
        if (nextA !== a) {
            out[i + 3] = nextA;
            changedPixels++;
        }
    }

    await fs.mkdir(path.dirname(dst), { recursive: true });
    await sharp(out, { raw: info }).png().toFile(dst);
    return { changedPixels, totalPixels: info.width * info.height };
}

function toPosixRelative(base, p) {
    return path.relative(base, p).split(path.sep).join('/');
}

async function main() {
    const opts = parseArgs(process.argv);
    const inputRoot = opts.input;
    const outputRoot = opts.output;

    await fs.mkdir(outputRoot, { recursive: true });
    const files = await listImages(inputRoot);
    const filtered = files.filter((p) => !p.startsWith(outputRoot + path.sep));
    if (filtered.length === 0) {
        console.log('No source images found:', inputRoot);
        return;
    }

    const manifest = [];
    for (const src of filtered) {
        const rel = path.relative(inputRoot, src);
        const outRel = rel.replace(/\.(jpg|jpeg|webp)$/i, '.png');
        const dst = path.join(outputRoot, outRel);
        const stat = await processOne(src, dst, opts);
        manifest.push({
            source: toPosixRelative(ROOT, src),
            output: toPosixRelative(ROOT, dst),
            hasAlpha: true,
            changedPixels: stat.changedPixels
        });
        console.log('OK', outRel, `changed=${stat.changedPixels}`);
    }

    const manifestPath = path.join(outputRoot, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log('Done:', manifest.length, 'images');
    console.log('Manifest:', toPosixRelative(ROOT, manifestPath));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

