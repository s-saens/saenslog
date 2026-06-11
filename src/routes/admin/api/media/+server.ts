import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/adminApiAuth';
import { mediaStore } from '$lib/server/mediaStore';
import type { RequestHandler } from './$types';

const LIMIT = 500;

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);
const AUDIO_EXT = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac']);

function kindForKey(key: string): 'image' | 'audio' | null {
	const m = key.match(/(\.[a-z0-9]+)$/i);
	if (!m) return null;
	const ext = m[1].toLowerCase();
	if (IMAGE_EXT.has(ext)) return 'image';
	if (AUDIO_EXT.has(ext)) return 'audio';
	return null;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireAdmin(locals.supabase);

	const kindFilter = url.searchParams.get('kind');

	const objects = await mediaStore().list('');
	let items = objects
		.map((obj) => ({ obj, kind: kindForKey(obj.key) }))
		.filter((x): x is { obj: (typeof objects)[number]; kind: 'image' | 'audio' } => x.kind != null);

	if (kindFilter === 'image' || kindFilter === 'audio') {
		items = items.filter((x) => x.kind === kindFilter);
	}

	items.sort((a, b) => b.obj.uploadedAtMs - a.obj.uploadedAtMs);
	const sliced = items.slice(0, LIMIT);

	return json({
		items: sliced.map(({ obj, kind }) => ({
			path: `/${obj.key}`,
			kind,
			byte_size: obj.size
		}))
	});
};
