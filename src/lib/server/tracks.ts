import { mediaStore } from '$lib/server/mediaStore';
import type { Track } from '$lib/stores/music.svelte';

const AUDIO_EXTENSIONS = /\.(mp3|ogg|flac|wav|m4a|aac)$/i;

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
	const objects = await mediaStore().list('musics/');
	return objects
		.map((obj) => obj.key.slice('musics/'.length))
		.filter((filename) => filename && !filename.includes('/') && AUDIO_EXTENSIONS.test(filename))
		.sort()
		.map((filename, i) => ({
			id: i + 1,
			...parseFilename(filename),
			src: `/musics/${encodeURIComponent(filename)}`,
			duration: ''
		}));
}

export function getTracks() {
	tracksCache ??= readTracks().catch((e) => {
		tracksCache = null;
		throw e;
	});
	return tracksCache;
}
