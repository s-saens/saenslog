<script lang="ts">
	import textCountIcon from '$lib/assets/text-count.svg';
	import BlogItemFolder from '$lib/components/BlogItemFolder.svelte';
	import BlogItemPost from '$lib/components/BlogItemPost.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

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
	<div class="container">
		<header>
			<nav class="breadcrumb">
				{#each data.breadcrumb as crumb, i}
					{#if i > 0}
						<span class="separator">‣</span>
					{/if}
					{#if data.isPost}
						<!-- 포스트 페이지: 모든 breadcrumb이 링크 -->
						<a href={crumb.path} class="crumb">{crumb.label}</a>
					{:else}
						<!-- 폴더 페이지: 마지막은 현재 위치 (볼드, 링크 없음) -->
						{#if i === data.breadcrumb.length - 1}
							<span class="crumb current">{crumb.label}</span>
						{:else}
							<a href={crumb.path} class="crumb">{crumb.label}</a>
						{/if}
					{/if}
				{/each}
			</nav>
		</header>

		{#if data.isPost}
			<!-- 글 페이지 -->
			<article class="post">
				<h1>{data.title || '제목 없음'}</h1>
			<div class="post-meta">
				<span class="date">{formatDate(data.date)}</span>
				<span class="separator">•</span>
				<span class="word-count">
					<img src={textCountIcon} alt="count" />
					{data.wordCount}
				</span>
			</div>
				<div class="content">
					{@html data.content}
				</div>
			</article>
		{:else}
			<!-- 카테고리 페이지 -->
			<section class="items-section">
				{#if data.folders}
					{#each data.folders as folder}
						<BlogItemFolder {...folder} />
					{/each}
				{/if}
				{#if data.posts}
					{#each data.posts as post}
						<BlogItemPost {...post} />
					{/each}
				{/if}
			</section>
		{/if}
	</div>
</main>

<style>
	main {
		width: 100%;
		max-width: 600px;
		padding: 2rem;
		padding-top: 5rem;
		align-self: flex-start;
	}

	.container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
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
		font-size: 0.95rem;
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
	}

	.post .content :global(h1),
	.post .content :global(h2),
	.post .content :global(h3) {
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	.post .content :global(code) {
		background-color: var(--bg-lighter);
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.post .content :global(pre) {
		background-color: var(--bg-lighter);
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

	@media (max-width: 768px) {
		main {
			padding: 1rem;
			padding-top: 4rem;
		}
	}
</style>

