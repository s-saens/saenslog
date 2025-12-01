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
					<span class="crumb">{crumb}</span>
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
	}

	.container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	header {
		padding-bottom: 1rem;
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
		}
	}
</style>

