<script lang="ts">
	import { goto } from '$app/navigation';
	import ProjectCarousel from '$lib/components/ProjectCarousel.svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		data: {
			projects: Array<{
				id: string;
				title: string;
				tags: string[];
				startDate: string;
				endDate: string;
				logoPath: string;
			}>;
		};
	}

	let { data }: Props = $props();

	let selectedIndex = $state(0);
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	function handleSelect(index: number) {
		selectedIndex = index;
	}

	function handleClick(index: number) {
		if (index === selectedIndex) {
			// 현재 선택된 프로젝트를 클릭하면 상세 페이지로 이동
			goto(`/projects/${data.projects[index].title}`);
		} else {
			// 다른 프로젝트를 클릭하면 해당 프로젝트를 선택
			selectedIndex = index;
		}
	}
</script>

<main>
	{#if mounted}
		<div class="content-wrapper" transition:fade|global={{ duration: 500 }}>
			<div class="header-section">
				<h1 class="project-title">{data.projects[selectedIndex]?.title || ''}</h1>
				<div class="tags">
					{#each data.projects[selectedIndex]?.tags || [] as tag}
						<span class="tag">{tag.toUpperCase()}</span>
					{/each}
				</div>
			</div>

			<ProjectCarousel
				projects={data.projects}
				bind:selectedIndex
				onSelect={handleSelect}
				onClick={handleClick}
			/>
		</div>
	{/if}
</main>

<style>
	main {
		height: 100vh;
		overflow: visible;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text);
	}

	.content-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: top;
		justify-content: center;
	}

	.header-section {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		text-align: center;
		z-index: 10;
		flex: 0.3;
	}

	.project-title {
		font-size: 2rem;
		font-weight: 300;
		margin: 0 0 1rem 0;
		letter-spacing: 0.05em;
	}

	.tags {
		display: flex;
		gap: 0.8rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.tag {
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		color: var(--text-tertiary);
		font-weight: 300;
	}

	@media (max-width: 768px) {
		.project-title {
			font-size: 1.8rem;
		}

		.tag {
			font-size: 0.65rem;
		}
	}

	@media (max-width: 480px) {
		.project-title {
			font-size: 1.5rem;
		}

		.tag {
			font-size: 0.6rem;
		}
	}
</style>

