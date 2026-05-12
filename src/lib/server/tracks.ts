import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Track } from '$lib/stores/music.svelte';

const AUDIO_EXTENSIONS = /\.(mp3|ogg|flac|wav|m4a|aac)$/i;
const musicsDir = path.join(process.cwd(), 'static', 'musics');

let tracksCache: Promise<Track[]> | null = null;

function parseFilename(filename: string): Pick<Track, 'artist' | 'title' | 'subtitle'> {
	const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
	const parts = nameWithoutExt.split('-').map((p) => p.trim());
	return {
		artist: parts[0] ?? 'Unknown',
		title: parts[1] ?? filename,
		subtitle: parts[2] ?? ''
	};
}

async function readTracks(): Promise<Track[]> {
	try {
		const files = await readdir(musicsDir);
		return files
			.filter((filename) => AUDIO_EXTENSIONS.test(filename))
			.map((filename, i) => ({
				id: i + 1,
				...parseFilename(filename),
				src: `/musics/${encodeURIComponent(filename)}`,
				duration: ''
			}));
	} catch (e) {
		if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') {
			return [];
		}
		throw e;
	}
}

export function getTracks() {
	tracksCache ??= readTracks();
	return tracksCache;
}
