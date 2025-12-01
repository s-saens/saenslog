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
			<h1>Blog</h1>
		</header>

		<section class="folders-section">
			{#each data.folders as folder}
				<BlogItemFolder {...folder} />
			{/each}
		</section>

		<section class="recent-posts">
			<h2>Recent Posts</h2>
			<div class="posts-list">
				{#each data.recentPosts as post}
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
	}

	.container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	header {
		padding-bottom: 1rem;
	}

	header h1 {
		font-size: 1.2rem;
		font-weight: 600;
		margin: 0;
	}

	.folders-section {
		display: flex;
		flex-direction: column;
	}

	.recent-posts {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.recent-posts h2 {
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
		}
	}
</style>

