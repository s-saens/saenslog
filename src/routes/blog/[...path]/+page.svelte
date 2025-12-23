<script lang="ts">
	import { resolve } from '$app/paths';
	import textCountIcon from '$lib/assets/text-count.svg';
	import BlogItemFolder from '$lib/components/BlogItemFolder.svelte';
	import BlogItemPost from '$lib/components/BlogItemPost.svelte';
	import { fade, fly } from 'svelte/transition';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	
	const transitionDelay = 75;

	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr);
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const dayName = days[d.getDay()];
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		return `${year}.${month}.${day}.${dayName}. ${hours}:${minutes} GMT+9`;
	}
</script>

<main>
	<div class="container" transition:fade={{ duration: 500 }}>
		<header>
			<nav class="breadcrumb">
				{#each data.breadcrumb as crumb, i (crumb.path || crumb.label || i)}
					{#if i > 0}
						<span class="separator">‣</span>
					{/if}
					{#if data.isPost}
						<!-- 포스트 페이지: 모든 breadcrumb이 링크 -->
						<a href={resolve(crumb.path)} class="crumb">{crumb.label}</a>
					{:else}
						<!-- 폴더 페이지: 마지막은 현재 위치 (볼드, 링크 없음) -->
						{#if i === data.breadcrumb.length - 1}
							<span class="crumb current">{crumb.label}</span>
						{:else}
							<a href={resolve(crumb.path)} class="crumb">{crumb.label}</a>
						{/if}
					{/if}
				{/each}
			</nav>
		</header>

		{#if data.isPost}
			<!-- 글 페이지 -->
			<article class="post">
				<div in:fly={{ duration: 500 }}>
					<h1>{data.title || '제목 없음'}</h1>
				</div>
				<div class="post-meta" in:fly={{ duration: 500, y: 100, delay: 300}}>
					<span class="date">{formatDate(data.date)}</span>
					<span class="separator">•</span>
					<span class="word-count">
						<img src={textCountIcon} alt="count" />
						{data.wordCount}
					</span>
				</div>
				<div class="content" in:fly={{ duration: 1000, y: 100, delay: 450}}>
					{@html data.content}
				</div>
				<div class="footer"></div>
			</article>
		{:else}
			<!-- 카테고리 페이지 -->
			<section class="items-section" in:fade={{ duration: 500 }}>
			{#if data.folders}
				{#each data.folders.filter((f: typeof data.folders[number]) => f.totalPostCount > 0) as folder, i (folder.path)}
					<div in:fly|global={{ duration: 400, x: 100, delay: i * transitionDelay}}>
						<BlogItemFolder {...folder} />
					</div>
				{/each}
			{/if}
				{#if data.posts}
					{#each data.posts as post, i (post.path)}
						<div in:fly|global={{ duration: 400, x: 100, delay: ((data.folders?.length || 0) + i) * transitionDelay}}>
							<BlogItemPost {...post} />
						</div>
					{/each}
				{/if}
			</section>
		{/if}

		{#if data.allPosts && data.allPosts.length > 0}
			<section class="all-posts">
				<div class="all-posts-header">
					<h2>All Posts</h2>
					<div class="all-posts-count">
						<span>({data.allPosts.length})</span>
					</div>
				</div>
				<div class="posts-list">
					{#each data.allPosts as post, i (post.path)}
						<div in:fly|global={{ duration: 400, x: 100, delay: ((data.folders?.length || 0) + (data.posts?.length || 0) + i) * transitionDelay}}>
							<BlogItemPost {...post} />
						</div>
					{/each}
				</div>
				<div class="footer"></div>
			</section>
		{/if}
	</div>
</main>

<style>
	main {
		width: 100%;
		padding: 5.25rem 2rem;
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
  		scrollbar-gutter: stable;  /* 지원 브라우저에서 레이아웃 흔들림 방지 */
  		padding: 0 20px;
		gap: 1rem;
	}

	.container {
		scrollbar-width: auto;
		scrollbar-color: var(--text-tertiary) var(--bg-lighter);
	}

	.container::-webkit-scrollbar-track {
		background: var(--bg-lighter);
		border-radius: 999px;
		margin-block: 8px;
	}

	.container::-webkit-scrollbar-thumb:hover {
		background: var(--text-tertiary);
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

	.items-section {
		display: flex;
		flex-direction: column;
	}

	/* 글 페이지 */
	.post {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		font-family: var(--font-default);
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

	.post-meta .separator {
		color: var(--text-tertiary);
	}

	.word-count {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.word-count img {
		width: 14px;
		height: 14px;
	}

	.post .content {
		line-height: 1.8;
		user-select: text;
		-webkit-user-select: text;
	}

	/* 마크다운 콘텐츠 스타일 */
	.post .content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 10px;
	}

	.post .content :global(p) {
		margin: 1rem 0;
		font-family: var(--font-default);
		font-size: 0.95rem;
		font-weight: 400;
		color: var(--text-secondary);
		text-align: justify;
	}

	.post .content :global(h1),
	.post .content :global(h2),
	.post .content :global(h3) {
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	.post .content :global(code) {
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.post .content :global(pre) {
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
	}

	.post .content :global(pre code) {
		background: none;
		padding: 0;
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
	}

	.post .content :global(a) {
		color: var(--text);
		text-decoration: underline;
	}

	.post .content :global(a:hover) {
		opacity: 0.7;
	}

	/* All Posts 섹션 */
	.all-posts {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border);
		margin-top: 0.5rem;
	}

	.all-posts h2 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.all-posts-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.all-posts-count {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.posts-list {
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 768px) {
		main {
			padding: 1rem;
			padding-top: 4rem;
		}
	}

	.footer {
		display: flex;
		height: 50px;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-tertiary);
	}
</style>

