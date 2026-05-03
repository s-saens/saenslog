<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { setupCodeBlocks } from '$lib/actions/setupCodeBlocks';
	import { setupTables } from '$lib/actions/setupTables';
	import { TextCountIcon } from '$lib/components/icons';
	import { formatDate } from '$lib/utils/dateFormatter';

	let {
		open = $bindable(false),
		title,
		slug,
		html,
		wordCount
	}: {
		open: boolean;
		title: string;
		slug: string;
		html: string;
		wordCount: number;
	} = $props();

	let contentEl = $state<HTMLDivElement | undefined>();

	const previewDateIso = $derived(new Date().toISOString());

	const crumbSegments = $derived(slug.split('/').filter(Boolean));

	$effect(() => {
		if (!browser || !open || !contentEl) return;
		void html;
		setupCodeBlocks(contentEl);
		setupTables(contentEl);
	});

	$effect(() => {
		if (!browser || !open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		window.addEventListener('keydown', onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = prev;
		};
	});
</script>

{#if open}
	<div class="overlay-root" role="dialog" aria-modal="true" aria-label="블로그 미리보기">
		<div class="overlay-bar">
			<button type="button" class="close-btn" onclick={() => (open = false)}>닫기</button>
			<span class="bar-hint"
				>실제 글 페이지 레이아웃과 동일하게 보입니다. 저장 전까지 블로그에는 반영되지 않습니다.</span
			>
		</div>
		<div class="overlay-scroll">
			<div class="inner">
				<header>
					<nav class="breadcrumb" aria-label="경로">
						<a href={resolve('/blog')} class="crumb">Blog</a>
						{#each crumbSegments as seg, i (i)}
							<span class="sep">‣</span>
							{@const path = crumbSegments.slice(0, i + 1).join('/')}
							{#if i < crumbSegments.length - 1}
								<a href={resolve(`/blog/${path}` as '/blog' | `/blog/${string}`)} class="crumb"
									>{seg}</a
								>
							{:else}
								<span class="crumb current">{seg}</span>
							{/if}
						{/each}
					</nav>
				</header>

				<article class="post">
					<div class="title-row">
						<h1>{title.trim() || '제목 없음'}</h1>
					</div>
					<div class="post-meta">
						<span class="date">{formatDate(previewDateIso)}</span>
						<span class="dot">•</span>
						<span class="word-count">
							<TextCountIcon width={14} height={14} />
							{wordCount}
						</span>
					</div>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- 미리보기용 마크다운 HTML -->
					<div class="content" lang="en" bind:this={contentEl}>{@html html}</div>
				</article>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay-root {
		position: fixed;
		inset: 0;
		z-index: 4000;
		display: flex;
		flex-direction: column;
		background: var(--bg);
	}

	.overlay-bar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--border);
		background: color-mix(in srgb, var(--bg) 92%, var(--text));
	}

	.close-btn {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.4rem 0.85rem;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text-secondary);
		cursor: pointer;
		flex-shrink: 0;
	}

	.close-btn:hover {
		color: var(--text);
	}

	.bar-hint {
		font-size: 0.78rem;
		color: var(--text-tertiary);
		line-height: 1.4;
	}

	.overlay-scroll {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		padding: 1.25rem 1rem 3rem;
		display: flex;
		justify-content: center;
	}

	.inner {
		width: 100%;
		max-width: 650px;
		padding: 0 12px 2rem;
	}

	header {
		padding-bottom: 0.75rem;
		margin-bottom: 0.2rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}

	.crumb {
		color: var(--text);
		transition: opacity 0.2s;
	}

	a.crumb {
		text-decoration: underline;
	}

	a.crumb:hover {
		opacity: 0.6;
	}

	.crumb.current {
		font-weight: 700;
		text-decoration: none;
	}

	.sep {
		color: var(--text-tertiary);
		font-size: 0.8rem;
	}

	.post {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		font-family: var(--font-default);
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.post h1 {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
		margin-bottom: -0.5rem;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-tertiary);
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.dot {
		color: var(--text-tertiary);
	}

	.word-count {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.word-count :global(svg) {
		width: 14px;
		height: 14px;
	}

	/* 아래: 블로그 글 `.post .content`와 동일 계열 (마크다운 HTML) */
	.post :global(.content) {
		line-height: 1.8;
		user-select: text;
		-webkit-user-select: text;
		overflow-wrap: break-word;
	}

	.post :global(.content img) {
		max-height: 40vh;
		max-width: 100%;
		width: auto;
		height: auto;
		display: block;
		margin: 0 auto;
		border-radius: 10px;
		filter: var(--img-filter);
		transition: filter 0.3s ease;
	}

	.post :global(.content img.no-invert) {
		filter: none;
	}

	.post :global(.content p) {
		margin: 1rem 0;
		font-family: var(--font-default);
		font-size: 0.95rem;
		font-weight: 400;
		color: var(--text-secondary);
		text-align: justify;
		overflow-wrap: break-word;
		hyphens: auto;
		-webkit-hyphens: auto;
	}

	.post :global(.content h1),
	.post :global(.content h2),
	.post :global(.content h3) {
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	.post :global(.content code) {
		font-family: var(--font-mono);
		font-size: 0.85em;
		padding: 0.15em 0.45em;
		border-radius: 5px;
		background-color: color-mix(in srgb, var(--text) 8%, var(--bg));
		border: 1px solid var(--border);
		color: var(--text-secondary);
		word-break: break-all;
		overflow-wrap: break-word;
	}

	.post :global(.content pre) {
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--border);
		background: var(--code-bg) !important;
	}

	.post :global(.content > pre) {
		margin: 1.5rem 0;
	}

	.post :global(.content .code-block-shell) {
		position: relative;
		margin: 1.5rem 0;
	}

	.post :global(.content .code-block-shell pre) {
		margin: 0;
	}

	.post :global(.content .code-pre-wrap) {
		position: relative;
	}

	.post :global(.content .code-copy-track) {
		position: absolute;
		top: 50%;
		right: -0.05rem;
		transform: translateY(-50%);
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		pointer-events: none;
	}

	.post :global(.content .code-pre-wrap pre code),
	.post :global(.content .code-block-shell > pre code) {
		padding-right: 2.75rem;
	}

	.post :global(.content .code-copy-btn) {
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
		border-radius: 9px 0 0 9px;
		background: color-mix(in srgb, var(--bg) 22%, transparent);
		backdrop-filter: blur(1px) saturate(150%);
		color: var(--text-tertiary);
		cursor: pointer;
	}

	.post :global(.content pre code) {
		display: block;
		padding: 1.1rem 1.25rem;
		overflow-x: auto;
		background: none !important;
		border: none;
		font-size: 0.82rem;
		line-height: 1.7;
		color: inherit;
	}

	.post :global(.content .code-collapse-wrapper) {
		position: relative;
		margin: 1.5rem 0;
		border-radius: 10px 10px 0 0;
		border: 1px solid var(--border);
		background: var(--code-bg);
	}

	.post :global(.content .code-block-shell .code-collapse-wrapper) {
		margin: 0;
	}

	.post :global(.content .code-collapse-wrapper pre) {
		margin: 0;
		border-radius: 10px 10px 0 0;
		border: none;
		background: transparent !important;
		overflow: hidden;
	}

	.post :global(.content .code-collapse-wrapper.collapsed pre) {
		max-height: calc(12 * 0.82rem * 1.7 + 2.2rem);
		overflow-y: auto;
	}

	.post :global(.content .code-collapse-wrapper.expanded pre) {
		max-height: none;
		overflow-y: visible;
	}

	.post :global(.content .code-collapse-btn) {
		position: sticky;
		bottom: 0;
		z-index: 2;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem 0;
		background: var(--code-bg);
		border: none;
		border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
		border-radius: 10px 10px 0 0;
		cursor: pointer;
		color: var(--text-tertiary);
	}

	.post :global(.content .code-collapse-btn svg) {
		display: block;
		transition: transform 0.3s ease;
	}

	.post :global(.content .code-collapse-wrapper.expanded .code-collapse-btn svg) {
		transform: rotate(180deg);
	}

	.post :global(.content .table-container) {
		position: relative;
		margin: 1.5rem 0;
	}

	.post :global(.content .table-wrapper) {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.post :global(.content table) {
		width: max-content;
		min-width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		border: 1px solid var(--border);
		white-space: nowrap;
	}

	.post :global(.content table:has(img)) {
		width: 100%;
		white-space: normal;
	}

	.post :global(.content .table-wrapper:has(img)) {
		overflow-x: clip;
	}

	.post :global(.content thead) {
		background-color: color-mix(in srgb, var(--text) 6%, var(--bg));
	}

	.post :global(.content th) {
		padding: 0.65rem 0.9rem;
		text-align: center;
		font-weight: 600;
		color: var(--text);
		border: 1px solid var(--border);
		font-size: 0.82rem;
	}

	.post :global(.content td) {
		padding: 0.55rem 0.9rem;
		text-align: center;
		color: var(--text-secondary);
		border: 1px solid var(--border);
		vertical-align: middle;
	}

	.post :global(.content .table-scroll-btn) {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text-secondary);
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		box-shadow: 0 1px 4px color-mix(in srgb, var(--text) 12%, transparent);
	}

	.post :global(.content .table-scroll-btn.visible) {
		opacity: 1;
		pointer-events: auto;
	}

	.post :global(.content .table-scroll-left) {
		left: 0;
	}

	.post :global(.content .table-scroll-right) {
		right: 0;
	}

	.post :global(.content hr) {
		border: none;
		border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
		margin: 1.5rem 0;
	}

	.post :global(.content blockquote) {
		border-left: 3px solid var(--text-tertiary);
		margin: 1rem 0;
		padding-left: 1rem;
		color: var(--text-secondary);
	}

	.post :global(.content ul),
	.post :global(.content ol) {
		padding-left: 1.5rem;
		margin: 0.2rem 0;
	}

	.post :global(.content li) {
		font-family: var(--font-default);
		font-size: 0.95rem;
		font-weight: 400;
		color: var(--text-secondary);
		overflow-wrap: break-word;
		hyphens: auto;
		-webkit-hyphens: auto;
		margin: 0.2rem 0;
	}

	.post :global(.content li > p) {
		margin: 0.2rem 0;
	}

	.post :global(.content a) {
		color: var(--text);
		text-decoration: underline;
	}

	.post :global(.content a:hover) {
		opacity: 0.7;
	}
</style>
