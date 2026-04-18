<script lang="ts">
	import { browser } from '$app/environment';
	import { setupCodeBlocks } from '$lib/actions/setupCodeBlocks';
	import { setupTables } from '$lib/actions/setupTables';
	import BlogItemPost from '$lib/components/BlogItemPost.svelte';
	import ProjectDetailDeck from '$lib/components/project/ProjectDetailDeck.svelte';
	import ScreenshotCarousel from '$lib/components/ScreenshotCarousel.svelte';
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Link {
		name: string;
		icon: string;
		url: string;
	}

	interface Prize {
		name: string;
		date: string;
		award: string;
	}

	interface RelatedPost {
		title: string;
		path: string;
		category: string;
		date: string;
		wordCount: number;
		tistory?: string;
	}

	interface Props {
		data: {
			project: {
				id: string;
				title: string;
				tags: string[];
				startDate: string;
				endDate: string;
				logoPath: string;
				screenshotPaths: string[];
				links?: Link[];
				prizes?: Prize[];
			};
			relatedPosts?: RelatedPost[];
			descriptionSlides?: { html: string }[];
		};
	}

	let { data }: Props = $props();

	const iconLoaders = import.meta.glob<{ default: typeof import('svelte').SvelteComponent }>(
		'$lib/components/icons/*.svelte'
	);

	function getIconLoader(iconPath: string) {
		const file = iconPath.split('/').pop() ?? '';
		const key = Object.keys(iconLoaders).find((k) => k.endsWith(`/${file}`));
		return key ? iconLoaders[key] : null;
	}

	const slideCount = $derived(1 + (data.descriptionSlides?.length ?? 0));

	const hasAside = $derived(
		(data.project.prizes?.length ?? 0) > 0 || (data.relatedPosts?.length ?? 0) > 0
	);

	let logoReady = $state(false);

	$effect(() => {
		if (!browser) return;
		const path = data.project.logoPath;
		logoReady = false;
		const img = new Image();
		img.onload = () => {
			logoReady = true;
		};
		img.onerror = () => {
			logoReady = true;
		};
		img.src = path;
	});

	$effect(() => {
		if (!browser) return;
		void data.descriptionSlides;
		void tick().then(() => {
			for (const el of document.querySelectorAll<HTMLElement>('.project-desc-markdown')) {
				setupCodeBlocks(el);
				setupTables(el);
			}
		});
	});
</script>

<main class="project-detail">
	{#if browser}
		<div class="project-detail__inner" transition:fade|global={{ duration: 420 }}>
			<a href="/projects" class="project-detail__back">
				<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<path
						d="M12.5 15L7.5 10L12.5 5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span>Projects</span>
			</a>

			<ProjectDetailDeck {slideCount}>
				{#snippet renderSlide(i: number)}
					{#if i === 0}
						<div class="slide-info">
							{#snippet leftStack()}
								<div class="slide-info__hero">
									<div class="slide-info__logo-col">
										{#if logoReady}
											<img
												src={data.project.logoPath}
												alt=""
												class="slide-info__logo"
												decoding="async"
											/>
										{:else}
											<div class="slide-info__logo-ph" aria-hidden="true"></div>
										{/if}
									</div>
									<div class="slide-info__meta">
										<div class="slide-info__titleline">
											<h1 class="slide-info__title">{data.project.title}</h1>
											{#if data.project.links && data.project.links.length > 0}
												<nav class="slide-info__ext-links" aria-label="외부 링크">
													{#each data.project.links as link (link.url)}
														{@const loader = getIconLoader(link.icon)}
														<a
															href={link.url}
															target="_blank"
															rel="noopener noreferrer"
															class="slide-info__ext-link"
															aria-label={link.name}
														>
															{#if loader}
																{#await loader() then mod}
																	<mod.default />
																{/await}
															{:else}
																<svg
																	width="20"
																	height="20"
																	viewBox="0 0 16 16"
																	fill="none"
																	aria-hidden="true"
																>
																	<path
																		d="M12 8.66667V12.6667C12 13.0203 11.8595 13.3594 11.6095 13.6095C11.3594 13.8595 11.0203 14 10.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V5.33333C2 4.97971 2.14048 4.64057 2.39052 4.39052C2.64057 4.14048 2.97971 4 3.33333 4H7.33333M10 2H14M14 2V6M14 2L6.66667 9.33333"
																		stroke="currentColor"
																		stroke-width="1.5"
																		stroke-linecap="round"
																		stroke-linejoin="round"
																	/>
																</svg>
															{/if}
														</a>
													{/each}
												</nav>
											{/if}
										</div>
										<div class="slide-info__tags">
											{#each data.project.tags as tag (tag)}
												<span class="slide-info__tag">{tag}</span>
											{/each}
										</div>
										<p class="slide-info__dates">
											<span>{data.project.startDate}</span>
											<span class="slide-info__dash">—</span>
											<span>{data.project.endDate}</span>
										</p>
									</div>
								</div>
								{#if data.project.screenshotPaths.length > 0}
									<div class="slide-info__shots">
										<ScreenshotCarousel screenshots={data.project.screenshotPaths} />
									</div>
								{/if}
							{/snippet}

							{#if hasAside}
								<div class="slide-info__split">
									<div class="slide-info__left-stack">
										{@render leftStack()}
									</div>
									<aside
										class="slide-info__aside"
										data-slide-scroll="true"
										aria-label="수상 및 관련 글"
									>
										{#if data.project.prizes && data.project.prizes.length > 0}
											<section class="slide-info__prizes" aria-label="수상">
												<h2 class="slide-info__subheading">Awards</h2>
												<ul class="slide-info__prize-list">
													{#each data.project.prizes as p (p.name + p.date)}
														<li class="slide-info__prize">
															<span class="slide-info__prize-name">{p.name}</span>
															<span class="slide-info__prize-meta">
																<span>{p.date}</span>
																<span class="slide-info__prize-award">{p.award}</span>
															</span>
														</li>
													{/each}
												</ul>
											</section>
										{/if}

										{#if (data.relatedPosts?.length ?? 0) > 0}
											<section class="slide-info__related" aria-label="관련 글">
												<h2 class="slide-info__subheading">Related posts</h2>
												<div class="slide-info__blog-list">
													{#each data.relatedPosts ?? [] as post (post.path)}
														<BlogItemPost {...post} />
													{/each}
												</div>
											</section>
										{/if}
									</aside>
								</div>
							{:else}
								<div class="slide-info__left-stack slide-info__left-stack--solo">
									{@render leftStack()}
								</div>
							{/if}

							<p class="slide-info__hint">휠 또는 방향키로 다음 장을 넘겨 보세요</p>
						</div>
					{:else}
						<div class="slide-md project-desc-markdown" data-slide-scroll="true" lang="ko">
							<!-- eslint-disable svelte/no-at-html-tags -->
							{@html data.descriptionSlides?.[i - 1]?.html ?? ''}
						</div>
					{/if}
				{/snippet}
			</ProjectDetailDeck>
		</div>
	{/if}
</main>

<style>
	.project-detail {
		position: relative;
		/* 고정 상단 네비 아래에서부터 콘텐츠 시작 */
		padding: var(--site-header-height) 0 10rem;
		color: var(--text);
		min-height: 0;
		box-sizing: border-box;
	}

	.project-detail__inner {
		position: relative;
		max-width: min(900px, 96vw);
		margin: 0 auto;
		padding: 0 1rem;
	}

	.project-detail__back {
		position: absolute;
		top: 0.35rem;
		left: 0.5rem;
		z-index: 95;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: var(--font-default);
		font-size: 0.88rem;
		color: var(--text-secondary);
		text-decoration: none;
		letter-spacing: 0.04em;
		transition: color 0.2s ease;
	}

	.project-detail__back:hover {
		color: var(--text);
	}

	.slide-info {
		height: 100%;
		padding: 3rem 1rem 1.25rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		gap: 0.85rem;
		min-height: 0;
	}

	.slide-info__hero {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		gap: 1rem 1.25rem;
		flex: 0 0 auto;
		min-height: 0;
	}

	.slide-info__meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.45rem;
	}

	.slide-info__titleline {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
	}

	.slide-info__titleline .slide-info__title {
		flex: 0 1 auto;
	}

	.slide-info__ext-links {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		flex-shrink: 0;
	}

	.slide-info__ext-link {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-tertiary);
		line-height: 0;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.slide-info__ext-link:hover {
		color: var(--text);
	}

	.slide-info__ext-link :global(svg) {
		width: 20px;
		height: 20px;
	}

	.slide-info__logo-col {
		flex: 0 0 clamp(72px, 11vw, 112px);
		width: clamp(72px, 11vw, 112px);
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
	}

	.slide-info__logo {
		display: block;
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		border-radius: 0.5rem;
	}

	.slide-info__logo-ph {
		width: 100%;
		aspect-ratio: 1;
		max-height: 100%;
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--bg-lighter) 88%, var(--text));
		animation: ph-pulse 1.1s ease-in-out infinite;
	}

	.slide-info__split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(9rem, 22rem);
		gap: 1rem 1.35rem;
		align-items: stretch;
		flex: 1;
		min-height: 0;
	}

	.slide-info__left-stack {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		min-width: 0;
		min-height: 0;
	}

	.slide-info__left-stack--solo {
		flex: 1;
		min-height: 0;
	}

	.slide-info__aside {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
		min-width: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		align-self: stretch;
	}

	.slide-info__aside .slide-info__subheading {
		margin: 0 0 0.3rem;
	}

	@keyframes ph-pulse {
		50% {
			opacity: 0.75;
		}
	}

	.slide-info__shots {
		flex: 0 1 auto;
		min-height: 0;
		max-height: min(30vh, 240px);
		display: flex;
		flex-direction: column;
	}

	.slide-info__shots :global(.carousel-container) {
		flex: 0 1 auto;
		min-height: 0;
		padding: 0.5rem 0;
	}

	.slide-info__shots :global(.screenshot-image) {
		max-width: min(100%, 720px);
		max-height: min(24vh, 200px);
	}

	.slide-info__shots :global(.screenshot-image img) {
		max-height: min(24vh, 200px);
		width: auto;
		height: auto;
		object-fit: contain;
	}

	.slide-info__shots :global(.screenshot-placeholder) {
		width: min(100%, 560px);
		height: min(22vh, 180px);
		max-height: min(24vh, 200px);
	}

	.slide-info__title {
		margin: 0;
		font-family: var(--font-default);
		font-size: clamp(1.35rem, 3.2vw, 1.85rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.2;
	}

	.slide-info__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.slide-info__tag {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		padding: 0.28rem 0.55rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
		color: var(--text-secondary);
	}

	.slide-info__dates {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: var(--text-tertiary);
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: center;
	}

	.slide-info__dash {
		opacity: 0.55;
	}

	.slide-info__subheading {
		margin: 0.35rem 0 0.25rem;
		font-family: var(--font-default);
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--text-secondary);
	}

	.slide-info__prizes {
		padding-top: 0;
	}

	.slide-info__prizes + .slide-info__related {
		margin-top: 0.5rem;
	}

	.slide-info__prize-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.slide-info__prize {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.55rem 0.65rem;
		border-radius: 0.65rem;
		background: color-mix(in srgb, var(--bg-lighter) 55%, transparent);
		border: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
	}

	.slide-info__prize-name {
		font-family: var(--font-default);
		font-size: 0.9rem;
		font-weight: 500;
	}

	.slide-info__prize-meta {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-tertiary);
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.slide-info__prize-award {
		color: var(--text-secondary);
	}

	.slide-info__blog-list {
		border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
		background: color-mix(in srgb, var(--bg) 35%, transparent);
		overflow: hidden;
	}

	.slide-info__hint {
		margin: 0.75rem 0 0;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--text-tertiary);
		letter-spacing: 0.06em;
		flex-shrink: 0;
	}

	.slide-md {
		height: 100%;
		width: 100%;
		max-width: 52rem;
		margin: 0 auto;
		padding: 3rem 1.5rem 2rem;
		box-sizing: border-box;
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
		font-family: var(--font-default);
		user-select: text;
		-webkit-user-select: text;
	}

	.slide-md :global(h1),
	.slide-md :global(h2),
	.slide-md :global(h3) {
		font-family: var(--font-default);
		font-weight: 600;
		letter-spacing: -0.02em;
		margin: 1.25em 0 0.5em;
	}

	.slide-md :global(h1) {
		font-size: 1.65rem;
	}

	.slide-md :global(p) {
		line-height: 1.65;
		color: var(--text-secondary);
		margin: 0.65em 0;
	}

	.slide-md :global(a) {
		color: var(--text);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.slide-md :global(pre) {
		font-family: var(--font-mono);
		font-size: 0.82rem;
		border-radius: 0.5rem;
		overflow: auto;
		padding: 0.85rem 1rem;
		background: var(--code-bg);
		border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
	}

	.slide-md :global(code) {
		font-family: var(--font-mono);
		font-size: 0.88em;
	}

	/* 좁은 화면도 가로 배치 유지 — 로고·간격만 축소 */
	@media (max-width: 640px) {
		.slide-info__split {
			grid-template-columns: minmax(0, 1fr) minmax(7.5rem, 11rem);
			gap: 0.45rem 0.75rem;
		}

		.slide-info__hero {
			gap: 0.5rem 0.65rem;
		}

		.slide-info__logo-col {
			flex: 0 0 clamp(52px, 20vw, 88px);
			width: clamp(52px, 20vw, 88px);
		}

		.slide-info__title {
			font-size: clamp(1.05rem, 4.2vw, 1.5rem);
		}

		.slide-info__tags {
			gap: 0.3rem;
		}

		.slide-info__tag {
			font-size: 0.65rem;
			padding: 0.2rem 0.45rem;
		}

		.slide-info__dates {
			font-size: 0.75rem;
		}
	}
</style>
