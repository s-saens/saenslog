import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/adminApiAuth';
import type { RequestHandler } from './$types';

const LIMIT = 500;

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);
const AUDIO_EXT = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac']);

type Accum = {
	publicPath: string;
	kind: 'image' | 'audio';
	byte_size: number;
	mtimeMs: number;
};

async function scanStaticMedia(staticRoot: string, relDir: string, acc: Accum[]): Promise<void> {
	const dir = path.join(staticRoot, relDir);
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const ent of entries) {
		const piece = ent.name;
		const childRel = relDir ? `${relDir}/${piece}` : piece;

		if (ent.isDirectory()) {
			await scanStaticMedia(staticRoot, childRel, acc);
			continue;
		}

		const ext = path.extname(piece).toLowerCase();
		let kind: 'image' | 'audio' | null = null;
		if (IMAGE_EXT.has(ext)) kind = 'image';
		else if (AUDIO_EXT.has(ext)) kind = 'audio';
		if (!kind) continue;

		const full = path.join(staticRoot, ...childRel.split('/'));
		const st = await stat(full);
		if (!st.isFile()) continue;

		acc.push({
			publicPath: `/${childRel.split(path.sep).join('/')}`,
			kind,
			byte_size: st.size,
			mtimeMs: st.mtimeMs
		});
	}
}

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireAdmin(locals.supabase);

	const kindFilter = url.searchParams.get('kind');
	const staticRoot = path.join(process.cwd(), 'static');

	const acc: Accum[] = [];
	await scanStaticMedia(staticRoot, '', acc);

	let items = acc;
	if (kindFilter === 'image' || kindFilter === 'audio') {
		items = acc.filter((x) => x.kind === kindFilter);
	}

	items.sort((a, b) => b.mtimeMs - a.mtimeMs);
	const sliced = items.slice(0, LIMIT);

	return json({
		items: sliced.map(({ publicPath, kind, byte_size }) => ({
			path: publicPath,
			kind,
			byte_size
		}))
	});
};
