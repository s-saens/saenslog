/**
 * LogoIcon.svelte와 동일한 마크업(path)으로 1200×630 OG 이미지 생성 → static/og-default.png
 * 로고 크기·배경은 소스 아래 상수에서 조정.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Open Graph 권장 비율에 맞춘 캔버스 */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** LogoIcon viewBox 70×70 기준, 캔버스 안에 들어가는 로고 한 변 픽셀 */
const LOGO_PIXEL = 380;

/** 사이트 다크 테마 `--bg` (#222222) 과 맞춤 */
const BACKGROUND = '#222222';

/** 로고 채우기 — OG 미리보기 가독용 밝은색 */
const LOGO_FILL = '#ffffff';

const logoIconPath = path.join(root, 'src', 'lib', 'components', 'icons', 'LogoIcon.svelte');

function extractPathD(svelteSource) {
	const m = svelteSource.match(/\sd="([^"]+)"/);
	if (!m) throw new Error(`${logoIconPath}: path d="" 를 찾을 수 없습니다.`);
	return m[1];
}

function escapeXmlAttr(s) {
	return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const pathD = extractPathD(readFileSync(logoIconPath, 'utf8'));

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_PIXEL}" height="${LOGO_PIXEL}" viewBox="0 0 70 70" fill="none">
  <path d="${escapeXmlAttr(pathD)}" fill="${LOGO_FILL}"/>
</svg>`;

const logoPng = await sharp(Buffer.from(svg)).png().toBuffer();

const left = Math.round((OG_WIDTH - LOGO_PIXEL) / 2);
const top = Math.round((OG_HEIGHT - LOGO_PIXEL) / 2);

const outPath = path.join(root, 'static', 'og-default.png');

await sharp({
	create: {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		channels: 3,
		background: BACKGROUND
	}
})
	.composite([{ input: logoPng, left, top }])
	.png({ compressionLevel: 9 })
	.toFile(outPath);

console.log(
	`Wrote ${path.relative(root, outPath)} (${OG_WIDTH}×${OG_HEIGHT}, logo ${LOGO_PIXEL}px)`
);
