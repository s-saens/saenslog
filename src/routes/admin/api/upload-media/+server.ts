import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { error, json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/adminApiAuth';
import {
	blogAssetDirOnDisk,
	blogAssetPublicPrefix,
	nextSequentialAssetBasename
} from '$lib/server/blogPostAssets';
import { normalizeSlug } from '$lib/server/posts';
import type { RequestHandler } from './$types';

const MAX_BYTES = 25 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
	'image/png': '.png',
	'image/jpeg': '.jpg',
	'image/gif': '.gif',
	'image/webp': '.webp',
	'image/svg+xml': '.svg',
	'image/avif': '.avif',
	'audio/mpeg': '.mp3',
	'audio/ogg': '.ogg',
	'audio/wav': '.wav',
	'audio/x-wav': '.wav',
	'audio/mp4': '.m4a',
	'audio/aac': '.aac',
	'audio/flac': '.flac',
	'audio/x-flac': '.flac'
};

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireAdmin(locals.supabase);

	const form = await request.formData();
	const raw = form.get('file');
	if (!raw || !(raw instanceof File)) error(400, 'file 필드가 필요합니다.');

	let slug: string;
	try {
		slug = normalizeSlug(String(form.get('slug') ?? ''));
	} catch {
		error(400, '유효한 slug가 필요합니다.');
	}

	const mime = raw.type || 'application/octet-stream';
	if (!MIME_EXT[mime]) error(400, '지원하지 않는 형식입니다. (이미지·오디오만)');

	const buf = Buffer.from(await raw.arrayBuffer());
	if (buf.length > MAX_BYTES) error(413, '파일이 너무 큽니다.');

	const ext = MIME_EXT[mime];
	const dir = blogAssetDirOnDisk(slug);
	const filename = await nextSequentialAssetBasename(dir, ext);
	const diskPath = path.join(dir, filename);
	await writeFile(diskPath, buf);

	const publicPath = `${blogAssetPublicPrefix(slug)}/${filename}`;

	return json({ url: publicPath });
};
