<script lang="ts">
	import type { PageData } from './$types';
	import BlogItemFolder from '$lib/components/BlogItemFolder.svelte';
	import BlogItemPost from '$lib/components/BlogItemPost.svelte';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>{data.breadcrumb.join(' • ')} - Saens.kr</title>
</svelte:head>

<main>
	<div class="container">
		<header>
			<nav class="breadcrumb">
				{#each data.breadcrumb as crumb, i}
					{#if i > 0}
						<span class="separator">•</span>
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
				<div class="content">
					<p>여기에 블로그 글 내용이 들어갑니다.</p>
					<p>경로: {data.path}</p>
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
		border-bottom: 1px solid var(--border);
		margin-bottom: 0.25rem;
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
		gap: 2rem;
	}

	.post h1 {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
	}

	.post .content {
		line-height: 1.8;
		font-size: 0.95rem;
	}

	@media (max-width: 768px) {
		main {
			padding: 1rem;
			padding-top: 4rem;
		}
	}
</style>

