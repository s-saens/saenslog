<script lang="ts">
	import type { BlogFolderListItem, BlogPostListItem } from '$lib/types/blogDisplay';
	import { fly } from 'svelte/transition';
	import BlogItemFolder from './BlogItemFolder.svelte';
	import BlogItemPost from './BlogItemPost.svelte';

	interface Props {
		folders?: BlogFolderListItem[];
		posts?: BlogPostListItem[];
		transitionDelay: number;
	}

	let { folders, posts, transitionDelay }: Props = $props();

	const TRANSITION_DURATION = 400;
	const TRANSITION_X = 100;

	const filteredFolders = $derived.by(() => folders?.filter((f) => f.totalPostCount > 0) ?? []);
</script>

<section class="items-section">
	{#each filteredFolders as folder, i (folder.path)}
		<div
			in:fly|global={{
				duration: TRANSITION_DURATION,
				x: TRANSITION_X,
				delay: (1 + i) * transitionDelay
			}}
		>
			<BlogItemFolder {...folder} />
		</div>
	{/each}

	{#each posts ?? [] as post, i (post.path)}
		<div
			in:fly|global={{
				duration: TRANSITION_DURATION,
				x: TRANSITION_X,
				delay: (filteredFolders.length + 1 + i) * transitionDelay
			}}
		>
			<BlogItemPost {...post} />
		</div>
	{/each}
</section>

<style>
	.items-section {
		display: flex;
		flex-direction: column;
	}
</style>
