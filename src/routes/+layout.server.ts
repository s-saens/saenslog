import fs from 'fs';
import path from 'path';
import type { Track } from '$lib/stores/music.svelte';

const AUDIO_EXTENSIONS = /\.(mp3|ogg|flac|wav|m4a|aac)$/i;

function parseFilename(filename: string): Pick<Track, 'artist' | 'title' | 'subtitle'> {
	const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
	const parts = nameWithoutExt.split('-').map((p) => p.trim());
	return {
		artist: parts[0] ?? 'Unknown',
		title: parts[1] ?? filename,
		subtitle: parts[2] ?? ''
	};
}

export const load = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	let profile: App.Profile | null = null;
	if (user) {
		const { data } = await locals.supabase
			.from('profiles')
			.select('username, display_name, avatar_url, role')
			.eq('id', user.id)
			.single();
		if (data && (data.role === 'admin' || data.role === 'member')) {
			profile = data as App.Profile;
		}
	}

	const musicsDir = path.join(process.cwd(), 'static', 'musics');

	if (!fs.existsSync(musicsDir)) {
		return { session, user, profile, tracks: [] as Track[] };
	}

	const files = fs.readdirSync(musicsDir).filter((f) => AUDIO_EXTENSIONS.test(f));

	const tracks: Track[] = files.map((filename, i) => ({
		id: i + 1,
		...parseFilename(filename),
		src: `/musics/${encodeURIComponent(filename)}`,
		duration: ''
	}));

	return { session, user, profile, tracks };
};
