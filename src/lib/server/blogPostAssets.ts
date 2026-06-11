import { mediaStore } from '$lib/server/mediaStore';

const ASSET_FILE_RE = /^(\d{4})(\.\w+)$/i;

/** 미디어 저장소 키 접두사 (예: `blog/39`) */
export function blogAssetKeyPrefix(normalizedSlug: string): string {
	const parts = normalizedSlug.split('/').filter(Boolean);
	return ['blog', ...parts].join('/');
}

/** URL 경로 접두사 (슬래시로 조인, 필요 시 encode) */
export function blogAssetPublicPrefix(normalizedSlug: string): string {
	const segs = normalizedSlug.split('/').filter(Boolean);
	return '/blog/' + segs.map(encodeURIComponent).join('/');
}

export async function nextSequentialAssetBasename(
	keyPrefix: string,
	extWithDot: string
): Promise<string> {
	const objects = await mediaStore().list(`${keyPrefix}/`);
	let max = 0;
	for (const obj of objects) {
		const basename = obj.key.slice(keyPrefix.length + 1);
		const m = basename.match(ASSET_FILE_RE);
		if (m) max = Math.max(max, parseInt(m[1], 10));
	}
	const next = max + 1;
	if (next > 9999) throw new Error('에셋 번호가 9999를 넘었습니다.');
	const ext = extWithDot.startsWith('.')
		? extWithDot.toLowerCase()
		: `.${extWithDot.toLowerCase()}`;
	return `${String(next).padStart(4, '0')}${ext}`;
}

/** 글의 미디어 폴더 전체 삭제 (글 삭제 시) */
export async function deleteBlogAssetFolder(normalizedSlug: string): Promise<void> {
	await mediaStore().deletePrefix(`${blogAssetKeyPrefix(normalizedSlug)}/`);
}
