<script lang="ts">
	import { onMount } from 'svelte';

	// TODO: 실제 프로젝트 데이터 로드
	let projects = $state<any[]>([]);

	onMount(() => {
		// 임시 프로젝트 데이터
		projects = [
			{
				id: 1,
				title: '프로젝트 1',
				description: '프로젝트 설명',
				tags: ['Unity', 'Game'],
				year: 2024
			},
			{
				id: 2,
				title: '프로젝트 2',
				description: '또 다른 프로젝트',
				tags: ['Web', 'SvelteKit'],
				year: 2024
			}
		];
	});
</script>

<main>
	<header>
		<h1>프로젝트</h1>
		<p>다양한 프로젝트들을 소개합니다</p>
	</header>

	<section class="projects">
		{#if projects.length === 0}
			<p class="empty">아직 등록된 프로젝트가 없습니다.</p>
		{:else}
			<div class="project-grid">
				{#each projects as project}
					<article class="project-card">
						<div class="project-header">
							<h2>{project.title}</h2>
							<span class="year">{project.year}</span>
						</div>
						<p class="description">{project.description}</p>
						<div class="tags">
							{#each project.tags as tag}
								<span class="tag">{tag}</span>
							{/each}
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		text-align: center;
		padding: 3rem 0;
		border-bottom: 1px solid #e0e0e0;
		margin-bottom: 3rem;
	}

	header h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.empty {
		text-align: center;
		color: #666;
		padding: 4rem 0;
		font-size: 1.1rem;
	}

	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 2rem;
	}

	.project-card {
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		padding: 2rem;
		transition: all 0.3s;
	}

	.project-card:hover {
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
		transform: translateY(-4px);
	}

	.project-header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		margin-bottom: 1rem;
	}

	.project-card h2 {
		font-size: 1.5rem;
		margin: 0;
	}

	.year {
		color: #666;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.description {
		color: #444;
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}

	.tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tag {
		background-color: #f5f5f5;
		padding: 0.3rem 0.8rem;
		border-radius: 12px;
		font-size: 0.85rem;
		font-weight: 500;
	}
</style>

