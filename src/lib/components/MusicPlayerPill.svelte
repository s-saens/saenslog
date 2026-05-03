<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { music, type RepeatMode } from '$lib/stores/music.svelte';

	const PILL_W = 264;
	const PILL_H = 48;

	let posX = $state(0);
	let posY = $state(0);
	let mounted = $state(false);
	let isPlaylistOpen = $state(false);

	// Drag state
	let isDragMode = $state(false);
	let hasDragged = false;
	let wasInDragMode = false;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let pressStartX = 0;
	let pressStartY = 0;
	let pillStartX = 0;
	let pillStartY = 0;
	let capturedPointerId: number | null = null;

	let pillEl: HTMLDivElement = $state()!;
	let audioEl: HTMLAudioElement = $state()!;

	onMount(() => {
		posX = Math.round((window.innerWidth - PILL_W) / 2);
		posY = window.innerHeight - PILL_H - 20;
		mounted = true;

		const onResize = () => {
			posX = Math.max(0, Math.min(window.innerWidth - PILL_W, posX));
			posY = Math.max(0, Math.min(window.innerHeight - PILL_H, posY));
		};
		window.addEventListener('resize', onResize);

		const onDocClick = (e: MouseEvent) => {
			if (isPlaylistOpen && pillEl && !pillEl.contains(e.target as Node)) {
				isPlaylistOpen = false;
			}
		};
		document.addEventListener('click', onDocClick);

		return () => {
			window.removeEventListener('resize', onResize);
			document.removeEventListener('click', onDocClick);
		};
	});

	// Sync audio playback with store state
	$effect(() => {
		if (!audioEl || music.tracks.length === 0) return;
		const track = music.tracks[music.currentIndex];
		if (track.src && audioEl.src !== new URL(track.src, location.href).href) {
			audioEl.src = track.src;
			audioEl.load();
		}
		if (music.isPlaying) {
			audioEl.play().catch(() => {
				music.isPlaying = false;
			});
		} else {
			audioEl.pause();
		}
	});

	function onAudioMetadata() {
		if (!audioEl || music.tracks.length === 0) return;
		const secs = Math.floor(audioEl.duration);
		const m = Math.floor(secs / 60);
		const s = String(secs % 60).padStart(2, '0');
		music.tracks[music.currentIndex].duration = `${m}:${s}`;
	}

	function onAudioEnded() {
		if (music.repeatMode === 'repeat-one') {
			audioEl.currentTime = 0;
			audioEl.play().catch(() => {});
		} else if (music.repeatMode === 'next') {
			music.currentIndex = (music.currentIndex + 1) % music.tracks.length;
		} else {
			music.isPlaying = false;
		}
	}

	// ── Drag logic ──────────────────────────────────────────────

	function onPillPointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('.controls') || target.closest('.playlist')) return;
		e.preventDefault();

		pressStartX = e.clientX;
		pressStartY = e.clientY;
		pillStartX = posX;
		pillStartY = posY;
		hasDragged = false;
		wasInDragMode = false;

		longPressTimer = setTimeout(() => {
			longPressTimer = null;
			isDragMode = true;
			wasInDragMode = true;
			capturedPointerId = e.pointerId;
			pillEl.setPointerCapture(e.pointerId);
		}, 100);
	}

	function onPillPointerMove(e: PointerEvent) {
		if (!isDragMode) return;
		const dx = e.clientX - pressStartX;
		const dy = e.clientY - pressStartY;
		if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDragged = true;
		posX = Math.max(0, Math.min(window.innerWidth - PILL_W, pillStartX + dx));
		posY = Math.max(0, Math.min(window.innerHeight - PILL_H, pillStartY + dy));
	}

	function onPillPointerUp(e: PointerEvent) {
		const target = e.target as HTMLElement;

		// Controls/playlist 클릭이면 타이머만 정리하고 종료
		if (target.closest('.controls') || target.closest('.playlist')) {
			if (longPressTimer) {
				clearTimeout(longPressTimer);
				longPressTimer = null;
			}
			return;
		}

		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		if (capturedPointerId !== null) {
			pillEl.releasePointerCapture(capturedPointerId);
			capturedPointerId = null;
		}
		const wasDragging = isDragMode;
		isDragMode = false;

		if (!wasDragging && !wasInDragMode && !hasDragged) {
			isPlaylistOpen = !isPlaylistOpen;
		}
		wasInDragMode = false;
		hasDragged = false;
	}

	function onPillPointerCancel() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		isDragMode = false;
		wasInDragMode = false;
		hasDragged = false;
	}

	// ── Music controls ──────────────────────────────────────────

	function togglePlay(e: MouseEvent) {
		e.stopPropagation();
		music.isPlaying = !music.isPlaying;
	}

	function cycleRepeat(e: MouseEvent) {
		e.stopPropagation();
		const modes: RepeatMode[] = ['once', 'repeat-one', 'next'];
		const idx = modes.indexOf(music.repeatMode);
		music.repeatMode = modes[(idx + 1) % modes.length];
	}

	function selectTrack(index: number) {
		music.currentIndex = index;
		music.isPlaying = true;
		isPlaylistOpen = false;
	}

	const hasTracks = $derived(music.tracks.length > 0);
	const currentTrack = $derived(music.tracks[music.currentIndex]);
	const marqueeText = $derived(
		currentTrack
			? `${currentTrack.title}${currentTrack.subtitle ? ` · ${currentTrack.subtitle}` : ''}\u2002—\u2002${currentTrack.artist}\u2002\u2002\u2002\u2002`
			: 'No tracks\u2002\u2002\u2002\u2002'
	);
</script>

<!-- Hidden audio element -->
<audio bind:this={audioEl} onended={onAudioEnded} onloadedmetadata={onAudioMetadata}></audio>

{#if mounted}
	<div
		class="pill-wrapper"
		style="left: {posX}px; top: {posY}px;"
		bind:this={pillEl}
		onpointerdown={onPillPointerDown}
		onpointermove={onPillPointerMove}
		onpointerup={onPillPointerUp}
		onpointercancel={onPillPointerCancel}
		oncontextmenu={(e) => e.preventDefault()}
		role="presentation"
	>
		<!-- Playlist dropdown -->
		{#if isPlaylistOpen}
			<div class="playlist" transition:fly={{ y: 8, duration: 180, opacity: 0 }}>
				{#each music.tracks as track, i (track.id)}
					<button
						class="playlist-item"
						class:active={i === music.currentIndex}
						onclick={() => selectTrack(i)}
					>
						<span class="item-idx">{i + 1}</span>
						<span class="item-title">{track.title}</span>
						<span class="item-artist">{track.artist}</span>
						<span class="item-dur">{track.duration}</span>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Pill -->
		<div
			class="pill"
			class:drag-active={isDragMode}
			role="button"
			tabindex="0"
			aria-label="음악 플레이어"
		>
			<!-- Music note icon -->
			<div class="note-icon" aria-hidden="true">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none">
					<path
						d="M20 14V3L9 5V16"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M17 19H18C19.1046 19 20 18.1046 20 17V14H17C15.8954 14 15 14.8954 15 16V17C15 18.1046 15.8954 19 17 19Z"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M6 21H7C8.10457 21 9 20.1046 9 19V16H6C4.89543 16 4 16.8954 4 18V19C4 20.1046 4.89543 21 6 21Z"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>

			<!-- Scrolling title -->
			<div class="marquee-wrap">
				<div class="marquee-inner" class:paused={!music.isPlaying}>
					<span>{marqueeText}</span>
					<span>{marqueeText}</span>
				</div>
			</div>

			<!-- Controls -->
			<div class="controls">
				<!-- Play / Pause -->
				<button
					class="ctrl-btn"
					onclick={togglePlay}
					disabled={!hasTracks}
					aria-label={music.isPlaying ? '일시정지' : '재생'}
				>
					{#if music.isPlaying}
						<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
							<rect x="5" y="3" width="5" height="18" rx="1.5" />
							<rect x="14" y="3" width="5" height="18" rx="1.5" />
						</svg>
					{:else}
						<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 4.5v15l13.5-7.5L6 4.5z" />
						</svg>
					{/if}
				</button>

				<!-- Repeat mode -->
				<button
					class="ctrl-btn repeat-btn"
					class:dim={music.repeatMode === 'once'}
					onclick={cycleRepeat}
					disabled={!hasTracks}
					aria-label="반복 모드 변경"
					title={music.repeatMode === 'once'
						? '한 번만 재생'
						: music.repeatMode === 'repeat-one'
							? '한 곡 반복'
							: '다음 곡 재생'}
				>
					{#if music.repeatMode === 'repeat-one'}
						<!-- Repeat one: circular arrows + 1 -->
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M17 1l4 4-4 4" />
							<path d="M3 11V9a4 4 0 0 1 4-4h14" />
							<path d="M7 23l-4-4 4-4" />
							<path d="M21 13v2a4 4 0 0 1-4 4H3" />
							<text
								x="11"
								y="15.5"
								font-size="6.5"
								font-weight="bold"
								fill="currentColor"
								stroke="none"
								text-anchor="middle">1</text
							>
						</svg>
					{:else}
						<!-- Repeat all / once: same arrows -->
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M17 1l4 4-4 4" />
							<path d="M3 11V9a4 4 0 0 1 4-4h14" />
							<path d="M7 23l-4-4 4-4" />
							<path d="M21 13v2a4 4 0 0 1-4 4H3" />
						</svg>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.pill-wrapper {
		position: fixed;
		z-index: 200;
		width: 264px;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
	}

	/* ── Playlist ─────────────────────────────────── */
	.playlist {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 0;
		width: 100%;
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: blur(16px) saturate(150%);
		-webkit-backdrop-filter: blur(16px) saturate(150%);
		border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
	}

	.playlist-item {
		display: grid;
		grid-template-columns: 18px 1fr auto auto;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 9px 14px;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		color: var(--text-secondary);
		transition: background-color 0.15s ease;
		font-family: var(--font-mono);
		font-size: 0.72rem;
	}

	.playlist-item:hover {
		background: color-mix(in srgb, var(--text) 6%, transparent);
		color: var(--text);
	}

	.playlist-item.active {
		color: var(--text);
		background: color-mix(in srgb, var(--text) 8%, transparent);
	}

	.item-idx {
		font-size: 0.65rem;
		color: var(--text-tertiary);
		text-align: right;
	}

	.item-title {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-artist {
		color: var(--text-tertiary);
		white-space: nowrap;
	}

	.item-dur {
		color: var(--text-tertiary);
		font-variant-numeric: tabular-nums;
		margin-left: 4px;
	}

	/* ── Pill ─────────────────────────────────────── */
	.pill {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 48px;
		padding: 0 10px 0 12px;
		background: color-mix(in srgb, var(--bg) 75%, transparent);
		backdrop-filter: blur(16px) saturate(150%);
		-webkit-backdrop-filter: blur(16px) saturate(150%);
		border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
		border-radius: 9999px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		cursor: pointer;
		transition:
			box-shadow 0.3s ease,
			border-color 0.3s ease,
			transform 0.15s ease;
	}

	.pill:hover {
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
	}

	.pill.drag-active {
		cursor: grabbing;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
		transform: scale(1.03);
		border-color: color-mix(in srgb, var(--border) 90%, transparent);
		animation: drag-pulse 0.6s ease infinite alternate;
	}

	@keyframes drag-pulse {
		from {
			box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
		}
		to {
			box-shadow: 0 12px 48px rgba(0, 0, 0, 0.55);
		}
	}

	/* ── Note icon ───────────────────────────────── */
	.note-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-tertiary);
	}

	/* ── Marquee ──────────────────────────────────── */
	.marquee-wrap {
		flex: 1;
		overflow: hidden;
		min-width: 0;
		mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
		-webkit-mask-image: linear-gradient(
			to right,
			transparent 0%,
			black 8%,
			black 92%,
			transparent 100%
		);
	}

	.marquee-inner {
		display: inline-flex;
		white-space: nowrap;
		animation: marquee 10s linear infinite;
		font-size: 0.72rem;
		color: var(--text-secondary);
		letter-spacing: 0.02em;
	}

	.marquee-inner.paused {
		animation-play-state: paused;
	}

	@keyframes marquee {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}

	/* ── Controls ─────────────────────────────────── */
	.controls {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.ctrl-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--text-secondary);
		border-radius: 50%;
		padding: 0;
		transition:
			color 0.2s ease,
			background-color 0.2s ease;
	}

	.ctrl-btn:hover {
		color: var(--text);
		background: color-mix(in srgb, var(--text) 8%, transparent);
	}

	.ctrl-btn.dim {
		color: color-mix(in srgb, var(--text-secondary) 28%, transparent);
	}

	.ctrl-btn.dim:hover {
		color: color-mix(in srgb, var(--text-secondary) 52%, transparent);
		background: color-mix(in srgb, var(--text) 5%, transparent);
	}
</style>
