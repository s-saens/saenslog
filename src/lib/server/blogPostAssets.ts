import path from 'node:path';
import { access, copyFile, mkdir, readdir, rename, rm } from 'node:fs/promises';

const ASSET_FILE_RE = /^(\d{4})(\.\w+)$/i;

/** static/blog/<slug segments> */
export function blogAssetDirOnDisk(normalizedSlug: string): string {
	const parts = normalizedSlug.split('/').filter(Boolean);
	return path.join(process.cwd(), 'static', 'blog', ...parts);
}

/** URL 경로 접두사 (슬래시로 조인, 필요 시 encode) */
export function blogAssetPublicPrefix(normalizedSlug: string): string {
	const segs = normalizedSlug.split('/').filter(Boolean);
	return '/blog/' + segs.map(encodeURIComponent).join('/');
}

export async function nextSequentialAssetBasename(
	dir: string,
	extWithDot: string
): Promise<string> {
	await mkdir(dir, { recursive: true });
	let max = 0;
	let names: string[];
	try {
		names = await readdir(dir);
	} catch {
		names = [];
	}
	for (const n of names) {
		const m = n.match(ASSET_FILE_RE);
		if (m) max = Math.max(max, parseInt(m[1], 10));
	}
	const next = max + 1;
	if (next > 9999) throw new Error('에셋 번호가 9999를 넘었습니다.');
	const ext = extWithDot.startsWith('.')
		? extWithDot.toLowerCase()
		: `.${extWithDot.toLowerCase()}`;
	return `${String(next).padStart(4, '0')}${ext}`;
}

/** 본문에 들어 있는 `/blog/<oldSlug>/…` URL을 새 슬러그로 치환 */
export function rewriteBlogAssetPathsInMarkdown(
	md: string,
	oldSlug: string,
	newSlug: string
): string {
	if (oldSlug === newSlug || !md) return md;
	const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`(/blog/)${esc(oldSlug)}(/)`, 'g');
	return md.replace(re, `$1${newSlug}$2`);
}

/**
 * 게시 슬러그 폴더를 새 슬러그 위치로 옮김 (이미 있으면 순번 에셋만 병합 복사 후 기존 폴더 삭제).
 * 인자는 이미 `normalizeSlug` 된 값이어야 합니다.
 */
export async function moveBlogPostAssetFolder(oldSlug: string, newSlug: string): Promise<void> {
	if (oldSlug === newSlug) return;

	const oldDir = blogAssetDirOnDisk(oldSlug);
	const newDir = blogAssetDirOnDisk(newSlug);

	try {
		await access(oldDir);
	} catch {
		return;
	}

	let newExists = false;
	try {
		await access(newDir);
		newExists = true;
	} catch {
		newExists = false;
	}

	if (!newExists) {
		await mkdir(path.dirname(newDir), { recursive: true });
		await rename(oldDir, newDir);
		return;
	}

	const oldFiles = (await readdir(oldDir)).filter((f) => ASSET_FILE_RE.test(f)).sort();
	for (const f of oldFiles) {
		const ext = path.extname(f);
		const base = await nextSequentialAssetBasename(newDir, ext);
		await copyFile(path.join(oldDir, f), path.join(newDir, base));
	}
	await rm(oldDir, { recursive: true, force: true });
}
