<script lang="ts">
	import { fly } from 'svelte/transition';
	import BlogItemPost from './BlogItemPost.svelte';

	interface Props {
		allPosts: any[];
		folderCount: number;
		postCount: number;
		transitionDelay: number;
	}

	let { allPosts, folderCount, postCount, transitionDelay }: Props = $props();

	const TRANSITION_DURATION = 400;
	const TRANSITION_X = 100;
	const baseDelay = (folderCount + postCount + 1) * transitionDelay;
</script>

{#if allPosts.length > 0}
	<section class="all-posts">
		<div class="all-posts-header" in:fly|global={{ duration: TRANSITION_DURATION, x: TRANSITION_X, delay: baseDelay }}>
			<h2>All Posts</h2>
			<div class="all-posts-count">
				<span>({allPosts.length})</span>
			</div>
		</div>
		<div class="posts-list">
			{#each allPosts as post, i (post.path)}
				<div in:fly|global={{ duration: TRANSITION_DURATION, x: TRANSITION_X, delay: baseDelay + (1 + i) * transitionDelay }}>
					<BlogItemPost {...post} />
				</div>
			{/each}
		</div>
		<div class="footer"></div>
	</section>
{/if}

<style>
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
