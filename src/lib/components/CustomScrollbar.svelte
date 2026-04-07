<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { MAIN_SCROLL_KEY, type MainScrollContext } from '$lib/scrollContext';
	import { fly } from 'svelte/transition';
	import { getContext } from 'svelte';

	const scrollCtx = getContext<MainScrollContext | undefined>(MAIN_SCROLL_KEY);

	let scrollbarContainer = $state<HTMLDivElement | null>(null);
	let scrollThumb = $state<HTMLDivElement | null>(null);
	let isDragging = $state(false);
	let scrollPercentage = $state(0);
	let thumbHeight = $state(0);
	let isScrollable = $state(false);
	let isVisible = $state(false);

	let dragStartY = 0;
	let dragStartScrollTop = 0;
	let hideTimeout: number | null = null;

	let scrollableElement = $state<HTMLElement | null>(null);

	function setScrollbarWidth(width: number) {
		if (scrollbarContainer) {
			scrollbarContainer.style.width = `${width}px`;
		}
	}

	function updateScrollbar() {
		if (!scrollableElement) return;

		const scrollHeight = scrollableElement.scrollHeight;
		const clientHeight = scrollableElement.clientHeight;

		if (scrollHeight <= clientHeight) {
			isScrollable = false;
			isVisible = false;
			return;
		}

		isScrollable = true;

		const ratio = clientHeight / scrollHeight;
		thumbHeight = Math.max(30, ratio * clientHeight);

		const scrollTop = scrollableElement.scrollTop;
		const maxScroll = scrollHeight - clientHeight;
		scrollPercentage = maxScroll > 0 ? scrollTop / maxScroll : 0;
	}

	function handleScroll() {
		updateScrollbar();
		showScrollbar();
	}

	function showScrollbar(time: number = 1000) {
		if (!isScrollable) {
			isVisible = false;
			return;
		}

		isVisible = true;

		if (hideTimeout) {
			window.clearTimeout(hideTimeout);
		}

		if (!isDragging) {
			hideTimeout = window.setTimeout(() => {
				isVisible = false;
			}, time);
		}
	}

	function handleMouseEnter() {
		if (!isScrollable) return;

		isVisible = true;
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}
	}

	function handleMouseLeave() {
		if (!isDragging) {
			showScrollbar();
		}
	}

	function handleMouseDown(e: MouseEvent) {
		e.preventDefault();
		isDragging = true;
		dragStartY = e.clientY;

		if (scrollableElement) {
			dragStartScrollTop = scrollableElement.scrollTop;
		}

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;

		if (!scrollableElement || !scrollbarContainer) return;

		const deltaY = e.clientY - dragStartY;
		const containerHeight = scrollbarContainer.clientHeight;
		const scrollHeight = scrollableElement.scrollHeight;
		const clientHeight = scrollableElement.clientHeight;
		const maxScroll = scrollHeight - clientHeight;

		const scrollRatio = maxScroll / (containerHeight - thumbHeight);
		const newScrollTop = dragStartScrollTop + deltaY * scrollRatio;

		scrollableElement.scrollTop = Math.max(0, Math.min(maxScroll, newScrollTop));
	}

	function handleMouseUp() {
		isDragging = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
		showScrollbar();
	}

	function handleTrackClick(e: MouseEvent) {
		if (!scrollbarContainer || e.target !== scrollbarContainer) return;

		if (!scrollableElement) return;

		const rect = scrollbarContainer.getBoundingClientRect();
		const clickY = e.clientY - rect.top;
		const containerHeight = rect.height;

		const scrollHeight = scrollableElement.scrollHeight;
		const clientHeight = scrollableElement.clientHeight;
		const maxScroll = scrollHeight - clientHeight;

		const targetPercentage = (clickY - thumbHeight / 2) / (containerHeight - thumbHeight);
		const targetScroll = targetPercentage * maxScroll;

		scrollableElement.scrollTo({
			top: Math.max(0, Math.min(maxScroll, targetScroll)),
			behavior: 'smooth'
		});
	}

	function handleGlobalMouseMove(e: MouseEvent) {
		if (!isScrollable) return;

		const distanceFromRight = window.innerWidth - e.clientX;

		if (distanceFromRight <= 30) {
			isVisible = true;
			if (hideTimeout) {
				clearTimeout(hideTimeout);
				hideTimeout = null;
			}
		}
	}

	$effect(() => {
		if (!browser || !scrollCtx) return;

		const el = scrollCtx.scrollRoot;

		if (scrollableElement && scrollableElement !== el) {
			scrollableElement.removeEventListener('scroll', handleScroll);
		}
		window.removeEventListener('resize', updateScrollbar);
		window.removeEventListener('mousemove', handleGlobalMouseMove);

		if (!el) {
			scrollableElement = null;
			isScrollable = false;
			isVisible = false;
			return () => {};
		}

		scrollableElement = el;
		el.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', updateScrollbar);
		window.addEventListener('mousemove', handleGlobalMouseMove);

		updateScrollbar();

		return () => {
			el.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', updateScrollbar);
			window.removeEventListener('mousemove', handleGlobalMouseMove);
		};
	});

	afterNavigate(() => {
		if (browser) {
			queueMicrotask(() => updateScrollbar());
		}
	});

	$effect(() => {
		if (scrollbarContainer && scrollThumb) {
			const containerHeight = scrollbarContainer.clientHeight;
			const maxThumbTop = containerHeight - thumbHeight;
			const thumbTop = scrollPercentage * maxThumbTop;

			scrollThumb.style.transform = `translateY(${thumbTop}px)`;
		}
	});
</script>

{#if isScrollable}
	<div
		transition:fly|global={{ x: 16, duration: 300 }}
		class="custom-scrollbar"
		class:visible={isVisible}
		bind:this={scrollbarContainer}
		onclick={handleTrackClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				handleTrackClick(e as unknown as MouseEvent);
			}
		}}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		role="scrollbar"
		aria-controls="main-content"
		aria-valuenow={Math.round(scrollPercentage * 100)}
		aria-valuemin="0"
		aria-valuemax="100"
		aria-orientation="vertical"
		tabindex="-1"
	>
		<div
			class="scrollbar-thumb"
			class:dragging={isDragging}
			bind:this={scrollThumb}
			style="height: {thumbHeight}px"
			onmousedown={handleMouseDown}
			role="button"
			tabindex="0"
			aria-label="스크롤 핸들"
		></div>
	</div>
{/if}

<style>
	.custom-scrollbar {
		--width: 8px;

		position: fixed;
		top: 0;
		right: 4px;
		width: calc(var(--width) + 4px);
		height: 100vh;
		z-index: 200;
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.custom-scrollbar.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.scrollbar-thumb {
		position: absolute;
		top: 0;
		right: 0;
		width: calc(var(--width) - 4px);
		opacity: 0.6;
		background: linear-gradient(to bottom, var(--text-tertiary) 0%, var(--text-secondary) 100%);
		border-radius: 18px;
		cursor: pointer;
		transition:
			background 0.2s ease,
			width 0.2s ease,
			right 0.2s ease,
			height 0.2s ease;
		will-change: transform;
	}

	.custom-scrollbar:hover .scrollbar-thumb {
		width: var(--width);
		right: 4px;
		opacity: 1;
		transition:
			opacity 0.2s ease,
			width 0.2s ease,
			right 0.2s ease;
	}

	.scrollbar-thumb.dragging {
		width: var(--width);
		right: 4px;
		opacity: 1;
		transition:
			opacity 0.2s ease,
			width 0.2s ease;
	}
</style>
