<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { setupCodeBlocks } from '$lib/actions/setupCodeBlocks';
	import { setupTables } from '$lib/actions/setupTables';
	import { setupTOC } from '$lib/actions/setupTOC';
	import BlogAllPostsSection from '$lib/components/BlogAllPostsSection.svelte';
	import BlogListSection from '$lib/components/BlogListSection.svelte';
	import { TextCountIcon, TistoryIcon } from '$lib/components/icons';
	import { MAIN_SCROLL_KEY, type MainScrollContext } from '$lib/scrollContext';
	import { formatDate } from '$lib/utils/dateFormatter';
	import { fade, fly } from 'svelte/transition';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const mainScroll = getContext<MainScrollContext | undefined>(MAIN_SCROLL_KEY);

	const TRANSITION_DELAY = 70;

	let postContentEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!browser || !data.isPost || !postContentEl) return;
		void data.content; // reactive dependency
		setupCodeBlocks(postContentEl);
		setupTables(postContentEl);
		const cleanupTOC = setupTOC(postContentEl, {
			getScrollRoot: () => mainScroll?.scrollRoot ?? null
		});
		return cleanupTOC;
	});
</script>

<main>
	{#if browser}
		<div class="container" transition:fade|global={{ duration: 500 }}>
			<header>
				<nav class="breadcrumb">
					{#each data.breadcrumb as crumb, i (crumb.path || crumb.label || i)}
						{#if i > 0}
							<span class="separator">‣</span>
						{/if}
						{#if data.isPost}
							<a href={resolve(crumb.path as '/blog' | `/blog/${string}`)} class="crumb"
								>{crumb.label}</a
							>
						{:else if i === data.breadcrumb.length - 1}
							<span class="crumb current">{crumb.label}</span>
						{:else}
							<a href={resolve(crumb.path as '/blog' | `/blog/${string}`)} class="crumb"
								>{crumb.label}</a
							>
						{/if}
					{/each}
				</nav>
			</header>

			<div class="content-wrapper">
				{#if data.isPost}
					{#key data.title}
						<!-- 글 페이지 -->
						<article class="post" transition:fly|global={{ duration: 300, y: 100 }}>
							<div transition:fly|global={{ duration: 500, delay: 100 }}>
								<div class="title-row">
									<h1>{data.title || '제목 없음'}</h1>
									{#if data.tistory}
										<a
											href={data.tistory}
											target="_blank"
											rel="noopener noreferrer"
											class="tistory-link"
											aria-label="티스토리에서 보기"
										>
											<TistoryIcon width={24} height={24} />
										</a>
									{/if}
								</div>
							</div>
							<div class="post-meta" transition:fly|global={{ duration: 400, y: 100, delay: 150 }}>
								<span class="date">{formatDate(data.date ?? '')}</span>
								<span class="separator">•</span>
								<span class="word-count">
									<TextCountIcon width={14} height={14} />
									{data.wordCount}
								</span>
							</div>
							<div
								class="content"
								lang="en"
								bind:this={postContentEl}
								transition:fly|global={{ duration: 600, y: 100, delay: 200 }}
							>
								{@html data.content}
							</div>
							<div class="footer"></div>
						</article>
					{/key}
				{:else}
					{#key $page.url.pathname}
						<!-- 카테고리 페이지 -->
						<div class="list-wrapper">
							<BlogListSection
								folders={data.folders}
								posts={data.posts}
								transitionDelay={TRANSITION_DELAY}
							/>
							{#if $page.url.pathname === '/blog' || $page.url.pathname === '/blog/'}
								<BlogAllPostsSection
									allPosts={data.allPosts || []}
									folderCount={data.folders?.length || 0}
									postCount={data.posts?.length || 0}
									transitionDelay={TRANSITION_DELAY}
								/>
							{/if}
						</div>
					{/key}
				{/if}
			</div>
		</div>
	{/if}
</main>

<style>
	main {
		width: 100%;
		padding: 5.25rem 2rem 0;
		display: flex;
		justify-content: center;
	}

	.container {
		width: 100%;
		max-width: 650px;
		height: auto;
		display: flex;
		flex-direction: column;
		overflow-y: visible;
		scrollbar-gutter: stable; /* 지원 브라우저에서 레이아웃 흔들림 방지 */
		padding: 0 20px 5.25rem;
		gap: 1rem;
	}

	.content-wrapper {
		position: relative;
		width: 100%;
		min-height: 50vh;
	}

	.post,
	.list-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
	}

	.list-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 5rem;
	}

	header {
		padding-bottom: 0.75rem;
		margin-bottom: 0.2rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
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

	.separator {
		color: var(--text-tertiary);
		font-size: 0.8rem;
	}

	/* 글 페이지 */
	.post {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		font-family: var(--font-default);
		padding-bottom: 5rem;
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

	.tistory-link {
		position: relative;
		display: flex;
		align-items: center;
		flex-shrink: 0;
		margin-bottom: -0.5rem;
		color: var(--text-tertiary);
		transition:
			color 0.2s,
			opacity 0.2s;
	}

	.tistory-link::after {
		content: 'Tistory에서 보기';
		position: absolute;
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%) translateY(4px);
		background: color-mix(in srgb, var(--text) 90%, transparent);
		color: var(--bg);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		white-space: nowrap;
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		pointer-events: none;
		opacity: 0;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
	}

	.tistory-link:hover::after {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}

	.tistory-link:hover {
		color: var(--text);
		opacity: 0.7;
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

	.post-meta .separator {
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

	.post .content {
		line-height: 1.8;
		user-select: text;
		-webkit-user-select: text;
		overflow-wrap: break-word;
	}

	/* 마크다운 콘텐츠 스타일 */
	.post .content :global(img) {
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

	.post .content :global(img.no-invert) {
		filter: none;
	}

	.post .content :global(p) {
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

	.post .content :global(h1),
	.post .content :global(h2),
	.post .content :global(h3) {
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	/* 인라인 코드 */
	.post .content :global(code) {
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

	/* 코드블럭 (hydration 후 .code-block-shell로 감쌈) */
	.post .content :global(pre) {
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--border);
		background: var(--code-bg) !important;
	}

	.post .content > :global(pre) {
		margin: 1.5rem 0;
	}

	.post .content :global(.code-block-shell) {
		position: relative;
		margin: 1.5rem 0;
	}

	.post .content :global(.code-block-shell pre) {
		margin: 0;
	}

	.post .content :global(.code-pre-wrap) {
		position: relative;
	}

	/* 복사: 코드 영역 오른쪽 세로 중앙 (pre 내부 스크롤과 무관) */
	.post .content :global(.code-copy-track) {
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

	.post .content :global(.code-pre-wrap pre code),
	.post .content :global(.code-block-shell > pre code) {
		padding-right: 2.75rem;
	}

	.post .content :global(.code-copy-btn) {
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
		transition:
			color 0.18s ease,
			background-color 0.18s ease,
			border-color 0.18s ease;
	}

	.post .content :global(.code-copy-btn:hover) {
		color: var(--text);
		background: color-mix(in srgb, var(--bg) 58%, transparent);
		border-color: color-mix(in srgb, var(--border) 75%, var(--text));
	}

	.post .content :global(.code-copy-btn:active) {
		transform: translateY(0);
	}

	.post .content :global(.code-copy-btn.copied) {
		color: var(--text-secondary);
	}

	.post .content :global(.code-copy-btn svg) {
		display: block;
	}

	.post .content :global(pre code) {
		display: block;
		padding: 1.1rem 1.25rem;
		overflow-x: auto;
		background: none !important;
		border: none;
		font-size: 0.82rem;
		line-height: 1.7;
		color: inherit;
	}

	/* 코드블럭 접기/펴기 wrapper */
	.post .content :global(.code-collapse-wrapper) {
		position: relative;
		margin: 1.5rem 0;
		border-radius: 10px 10px 0 0;
		border: 1px solid var(--border);
		background: var(--code-bg);
		/* overflow: hidden 제거 — sticky button 작동을 위해 */
	}

	.post .content :global(.code-block-shell .code-collapse-wrapper) {
		margin: 0;
	}

	.post .content :global(.code-collapse-wrapper pre) {
		margin: 0;
		border-radius: 10px 10px 0 0;
		border: none;
		background: transparent !important;
		overflow: hidden; /* pre 자체 content 클리핑용 */
	}

	.post .content :global(.code-collapse-wrapper.collapsed pre) {
		max-height: calc(12 * 0.82rem * 1.7 + 2.2rem);
		overflow-y: auto;
	}

	.post .content :global(.code-collapse-wrapper.expanded pre) {
		max-height: none;
		overflow-y: visible;
	}

	/* 접기/펴기 버튼 */
	.post .content :global(.code-collapse-btn) {
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
		transition:
			color 0.2s ease,
			background-color 0.2s ease;
	}

	.post .content :global(.code-collapse-btn:hover) {
		color: var(--text-secondary);
		background: color-mix(in srgb, var(--code-bg) 85%, var(--text));
	}

	.post .content :global(.code-collapse-btn svg) {
		display: block;
		transition: transform 0.3s ease;
	}

	.post .content :global(.code-collapse-wrapper.expanded .code-collapse-btn svg) {
		transform: rotate(180deg);
	}

	/* 표 */
	.post .content :global(.table-container) {
		position: relative;
		margin: 1.5rem 0;
	}

	.post .content :global(.table-wrapper) {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.post .content :global(table) {
		width: max-content;
		min-width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		border: 1px solid var(--border);
		white-space: nowrap;
	}

	/* 이미지가 있는 표는 width 100%, 스크롤 없음 */
	.post .content :global(table:has(img)) {
		width: 100%;
		white-space: normal;
	}

	.post .content :global(.table-wrapper:has(img)) {
		overflow-x: clip;
	}

	.post .content :global(thead) {
		background-color: color-mix(in srgb, var(--text) 6%, var(--bg));
	}

	.post .content :global(th) {
		padding: 0.65rem 0.9rem;
		text-align: center;
		font-weight: 600;
		color: var(--text);
		border: 1px solid var(--border);
		font-size: 0.82rem;
		letter-spacing: 0.02em;
	}

	.post .content :global(td) {
		padding: 0.55rem 0.9rem;
		text-align: center;
		color: var(--text-secondary);
		border: 1px solid var(--border);
		vertical-align: middle;
		background-color: transparent;
	}

	.post .content :global(td:has(> img)),
	.post .content :global(th:has(> img)) {
		padding: 0;
		overflow: hidden;
	}

	.post .content :global(td img),
	.post .content :global(th img) {
		max-height: none;
		width: 100%;
		height: auto;
		border-radius: 0;
		display: block;
		margin: 0;
	}

	/* 표 스크롤 화살표 버튼 */
	.post .content :global(.table-scroll-btn) {
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
		transition:
			opacity 0.2s ease,
			background-color 0.15s ease;
		box-shadow: 0 1px 4px color-mix(in srgb, var(--text) 12%, transparent);
	}

	.post .content :global(.table-scroll-btn.visible) {
		opacity: 1;
		pointer-events: auto;
	}

	.post .content :global(.table-scroll-btn:hover) {
		background: color-mix(in srgb, var(--bg) 80%, var(--text));
	}

	.post .content :global(.table-scroll-left) {
		left: 0;
	}

	.post .content :global(.table-scroll-right) {
		right: 0;
	}

	.post .content :global(hr) {
		border: none;
		border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
		margin: 1.5rem 0;
	}

	.post .content :global(blockquote) {
		border-left: 3px solid var(--text-tertiary);
		margin: 1rem 0;
		padding-left: 1rem;
		color: var(--text-secondary);
	}

	.post .content :global(ul),
	.post .content :global(ol) {
		padding-left: 1.5rem;
		margin: 0.2rem 0;
	}

	.post .content :global(li) {
		font-family: var(--font-default);
		font-size: 0.95rem;
		font-weight: 400;
		color: var(--text-secondary);
		overflow-wrap: break-word;
		hyphens: auto;
		-webkit-hyphens: auto;
		margin: 0.2rem, 0;
	}

	.post .content :global(li > p) {
		margin: 0.2rem 0;
	}

	.post .content :global(a) {
		color: var(--text);
		text-decoration: underline;
	}

	.post .content :global(a:hover) {
		opacity: 0.7;
	}

	@media (max-width: 768px) {
		main {
			padding: 4rem 1rem 0;
		}

		.container {
			padding-bottom: 1rem;
		}
	}
</style>
