/**
 * static/favicon.svg → static/favicon.ico (32·16px PNG 합성)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'static', 'favicon.svg');
const svg = readFileSync(svgPath);

const buf32 = await sharp(svg).resize(32, 32).png().toBuffer();
const buf16 = await sharp(svg).resize(16, 16).png().toBuffer();
const ico = await pngToIco([buf32, buf16]);
writeFileSync(path.join(root, 'static', 'favicon.ico'), ico);
console.log('Wrote static/favicon.ico');
