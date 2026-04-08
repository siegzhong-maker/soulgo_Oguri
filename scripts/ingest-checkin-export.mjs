#!/usr/bin/env node
/**
 * Unpack a browser-exported soulgo-checkin-*.zip into 场景/generated/exports/.
 * Usage:
 *   npm run ingest:checkin -- path/to/soulgo-checkin-123-20260408.zip
 *   npm run ingest:checkin -- path/to/export.zip --print-manifest
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function parseArgs() {
    const argv = process.argv.slice(2);
    const out = { zipPath: null, printManifest: false };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--print-manifest') out.printManifest = true;
        else if (!argv[i].startsWith('-') && !out.zipPath) out.zipPath = argv[i];
    }
    return out;
}

function safeSeg(s) {
    return String(s || 'misc')
        .replace(/[/\\:*?"<>|\s]+/g, '_')
        .replace(/^\.+/, '')
        .slice(0, 96) || 'misc';
}

function pickManifestImageBasenames(zipNames) {
    const bases = zipNames.map((n) => path.basename(n));
    const collectible = bases.find((b) => /^collectible\./i.test(b));
    if (collectible) return collectible;
    const furniture = bases.find((b) => /^furniture\./i.test(b));
    if (furniture) return furniture;
    const diary = bases.find((b) => /^diary-aigc\./i.test(b));
    if (diary) return diary;
    return null;
}

async function main() {
    const { zipPath, printManifest } = parseArgs();
    if (!zipPath) {
        console.error('Usage: node scripts/ingest-checkin-export.mjs <export.zip> [--print-manifest]');
        process.exit(1);
    }
    const absZip = path.isAbsolute(zipPath) ? zipPath : path.join(process.cwd(), zipPath);
    if (!fs.existsSync(absZip)) {
        console.error('File not found:', absZip);
        process.exit(1);
    }

    const buf = fs.readFileSync(absZip);
    const zip = await JSZip.loadAsync(buf);
    const metaEntry = zip.file('meta.json');
    if (!metaEntry) {
        console.error('ZIP missing meta.json');
        process.exit(1);
    }
    const meta = JSON.parse(await metaEntry.async('string'));
    const diaryId = safeSeg(meta.diaryId || 'unknown');
    const locRaw =
        (meta.droppedScene && meta.droppedScene.regionLabel) ||
        meta.location ||
        'misc';
    const dirSeg = safeSeg(locRaw);
    const destDir = path.join(repoRoot, '场景', 'generated', 'exports', dirSeg, diaryId);
    fs.mkdirSync(destDir, { recursive: true });

    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    for (const name of names) {
        const f = zip.file(name);
        if (!f) continue;
        const base = path.basename(name);
        const data = await f.async('nodebuffer');
        const outPath = path.join(destDir, base);
        fs.writeFileSync(outPath, data);
        console.log('Wrote', path.relative(repoRoot, outPath));
    }

    if (printManifest) {
        const imageBase = pickManifestImageBasenames(names);
        const scene = meta.droppedScene || {};
        const imageRel = imageBase
            ? path.posix.join('场景/generated/exports', dirSeg, diaryId, imageBase)
            : path.posix.join('场景/generated/exports', dirSeg, diaryId, 'collectible.png');
        if (!imageBase) {
            console.warn('[manifest] No collectible.* / furniture.* / diary-aigc.* in ZIP; default path may need editing.');
        }
        const tierRaw = String(scene.tier || 'B').toUpperCase();
        const tier = ['S', 'A', 'B', 'C'].includes(tierRaw) ? tierRaw : 'B';
        const entry = [
            {
                image: imageRel,
                label: scene.label || meta.location || 'Export',
                collectCategory: scene.collectCategory || 'souvenir',
                tier,
                memoryTag: scene.memoryTag || `export_${diaryId}`,
                regionLabel: scene.regionLabel || meta.location || '',
                poolKey: scene.poolKey || '',
                source: 'checkin',
                intro:
                    (meta.diaryTextSnippet || '').slice(0, 280) ||
                    'ingest from check-in export',
                facts: ['SoulGo check-in export ingest'],
                tags: ['export', 'checkin']
            }
        ];
        const fragPath = path.join(destDir, 'manifest-entry.json');
        fs.writeFileSync(fragPath, JSON.stringify(entry, null, 2));
        console.log('Wrote', path.relative(repoRoot, fragPath));
        console.log('\n--- same fragment (for 场景/generated/badges/manifest.json) ---\n');
        console.log(JSON.stringify(entry, null, 2));
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
