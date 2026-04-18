<script lang="ts">
	import { nonPassiveWheel } from '$lib/actions/nonPassiveWheel';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	interface Props {
		slideCount: number;
		renderSlide: Snippet<[number]>;
	}

	let { slideCount, renderSlide }: Props = $props();

	let deckEl = $state<HTMLElement | null>(null);
	let slideIndex = $state(0);
	let reducedMotion = $state(false);

	const maxIndex = $derived(Math.max(0, slideCount - 1));

	const slideH = 'calc(100dvh - var(--site-header-height))';
	const trackHeight = $derived(
		`calc(${slideCount} * (100dvh - var(--site-header-height)))`
	);
	const translateY = $derived(
		`translateY(calc(-${slideIndex} * (100dvh - var(--site-header-height))))`
	);

	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	function goTo(i: number) {
		slideIndex = Math.min(maxIndex, Math.max(0, i));
	}

	function next() {
		goTo(slideIndex + 1);
	}

	function prev() {
		goTo(slideIndex - 1);
	}

	function slideScrollEl(e: Event): HTMLElement | null {
		const t = e.target as Node | null;
		if (!deckEl || !t) return null;
		let el: Node | null = t;
		while (el && el !== deckEl) {
			if (el instanceof HTMLElement && el.dataset.slideScroll === 'true') {
				return el;
			}
			el = el.parentNode;
		}
		return null;
	}

	function onWheel(e: WheelEvent) {
		const scroller = slideScrollEl(e);
		if (scroller && scroller.scrollHeight > scroller.clientHeight + 2) {
			const atTop = scroller.scrollTop <= 1;
			const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
			if (e.deltaY > 0 && !atBottom) return;
			if (e.deltaY < 0 && !atTop) return;
		}
		e.preventDefault();
		if (Math.abs(e.deltaY) < 2) return;
		if (e.deltaY > 0) next();
		else prev();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
			e.preventDefault();
			next();
		} else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
			e.preventDefault();
			prev();
		} else if (e.key === 'Home') {
			e.preventDefault();
			goTo(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			goTo(maxIndex);
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	const durationMs = $derived(reducedMotion ? 0 : 620);
	const easing = 'cubic-bezier(0.33, 1, 0.32, 1)';
</script>

<div
	class="project-deck"
	bind:this={deckEl}
	use:nonPassiveWheel={onWheel}
	style:--project-slide-h={slideH}
	role="region"
	aria-roledescription="carousel"
	aria-label="프로젝트 슬라이드"
>
	<div
		class="project-deck__track"
		style:height={trackHeight}
		style:transition-duration="{durationMs}ms"
		style:transition-timing-function={easing}
		style:transform={translateY}
		style:will-change="transform"
	>
		{#each Array.from({ length: slideCount }, (_, i) => i) as i (i)}
			<div class="project-deck__slide">
				{@render renderSlide(i)}
			</div>
		{/each}
	</div>

	<nav class="project-deck__dots" aria-label="슬라이드 목록">
		{#each Array.from({ length: slideCount }, (_, i) => i) as i (i)}
			<button
				type="button"
				class="project-deck__dot"
				class:project-deck__dot--active={i === slideIndex}
				aria-label="슬라이드 {i + 1}로 이동"
				aria-current={i === slideIndex ? 'true' : undefined}
				onclick={() => goTo(i)}
			></button>
		{/each}
	</nav>

	<div class="project-deck__edge-hint" aria-hidden="true">
		<button type="button" class="project-deck__edge-btn" onclick={prev} disabled={slideIndex <= 0}>
			<span class="sr-only">이전 슬라이드</span>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path
					d="M10 5L5 10L10 15"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		<button
			type="button"
			class="project-deck__edge-btn"
			onclick={next}
			disabled={slideIndex >= maxIndex}
		>
			<span class="sr-only">다음 슬라이드</span>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path
					d="M10 5L15 10L10 15"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</div>
</div>

<style>
	.project-deck {
		position: relative;
		width: 100%;
		height: var(--project-slide-h);
		min-height: 320px;
		overflow: hidden;
		border-radius: 0;
	}

	.project-deck__track {
		display: flex;
		flex-direction: column;
		transition-property: transform;
	}

	.project-deck__slide {
		flex: 0 0 var(--project-slide-h);
		height: var(--project-slide-h);
		width: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: center;
	}

	.project-deck__dots {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		z-index: 90;
		padding: 0.5rem 0.35rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg) 55%, transparent);
		backdrop-filter: blur(10px);
		border: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
	}

	.project-deck__dot {
		width: 9px;
		height: 9px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: color-mix(in srgb, var(--text-tertiary) 55%, transparent);
		cursor: pointer;
		transition:
			transform 0.2s ease,
			background 0.2s ease;
	}

	.project-deck__dot:hover {
		background: color-mix(in srgb, var(--text-secondary) 70%, transparent);
		transform: scale(1.15);
	}

	.project-deck__dot--active {
		background: var(--accent);
		transform: scale(1.25);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.project-deck__edge-hint {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 90;
		pointer-events: none;
	}

	.project-deck__edge-btn {
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
		background: color-mix(in srgb, var(--bg) 50%, transparent);
		backdrop-filter: blur(8px);
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			opacity 0.2s ease;
	}

	.project-deck__edge-btn:hover:not(:disabled) {
		color: var(--text);
		border-color: var(--border);
	}

	.project-deck__edge-btn:disabled {
		opacity: 0.25;
		cursor: not-allowed;
	}

	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 768px) {
		.project-deck__dots {
			right: 0.5rem;
			gap: 0.45rem;
		}

		.project-deck__edge-hint {
			left: 0.35rem;
		}
	}
</style>
