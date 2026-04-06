export interface Track {
	id: number;
	title: string;
	artist: string;
	duration: string;
	src?: string;
}

export type RepeatMode = 'once' | 'repeat-one' | 'next';

const initialTracks: Track[] = [
	{ id: 1, title: '곡 제목 1', artist: 'Saens', duration: '3:45' },
	{ id: 2, title: '곡 제목 2', artist: 'Saens', duration: '4:12' },
	{ id: 3, title: '곡 제목 3', artist: 'Saens', duration: '2:58' }
];

export const music = $state({
	tracks: initialTracks as Track[],
	currentIndex: 0,
	isPlaying: false,
	repeatMode: 'next' as RepeatMode
});
