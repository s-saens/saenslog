<script lang="ts">
	import BlogItemFolder from '$lib/components/BlogItemFolder.svelte';
	import BlogItemPost from '$lib/components/BlogItemPost.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Blog - Saens.kr</title>
</svelte:head>

<main>
	<div class="container">
		<header>
			<nav class="breadcrumb">
				<span class="crumb current">Blog</span>
			</nav>
		</header>

		<section class="folders-section">
			{#each data.folders as folder}
				<BlogItemFolder {...folder} />
			{/each}
		</section>

		<section class="all-posts">
			<h2>All Posts</h2>
			<div class="posts-list">
				{#each data.allPosts as post}
					<BlogItemPost {...post} />
				{/each}
			</div>
		</section>
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

	.crumb.current {
		color: var(--text);
		font-weight: 700;
	}

	.folders-section {
		display: flex;
		flex-direction: column;
	}

	.all-posts {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		margin-top: 0.5rem;
	}

	.all-posts h2 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
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
</style>

