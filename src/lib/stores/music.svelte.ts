export interface Track {
	id: number;
	title: string;
	subtitle: string;
	artist: string;
	duration: string;
	src: string;
}

export type RepeatMode = 'once' | 'repeat-one' | 'next';

export const music = $state({
	tracks: [] as Track[],
	currentIndex: 0,
	isPlaying: false,
	repeatMode: 'next' as RepeatMode
});
