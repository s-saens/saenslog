<script lang="ts">
	import ScreenshotCarousel from '$lib/components/ScreenshotCarousel.svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Link {
		name: string;
		icon: string;
		url: string;
	}

	interface Props {
		data: {
			project: {
				id: string;
				title: string;
				tags: string[];
				startDate: string;
				endDate: string;
				logoPath: string;
				screenshotPaths: string[];
				links?: Link[];
			};
		};
	}

	let { data }: Props = $props();
	let project = data.project;
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});
</script>

<main>
	{#if mounted}
		<div class="container" in:fade|global={{ duration: 500 }}>
			<a href="/projects" class="back-button">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				<span>Back</span>
			</a>

			<header>
				<div class="logo-container">
					<img src={project.logoPath} alt={`${project.title} 로고`} class="project-logo" />
				</div>
				<h1>{project.title}</h1>
				<div class="tags">
					{#each project.tags as tag (tag)}
						<span class="tag">{tag}</span>
					{/each}
				</div>
				<div class="date-info">
					<span>{project.startDate}</span>
					<span>-</span>
					<span>{project.endDate}</span>
				</div>

				{#if project.links && project.links.length > 0}
					<div class="links">
						{#each project.links as link (link.url)}
							<a href={link.url} target="_blank" rel="noopener noreferrer" class="link-button">
								{link.name}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
									<path d="M12 8.66667V12.6667C12 13.0203 11.8595 13.3594 11.6095 13.6095C11.3594 13.8595 11.0203 14 10.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V5.33333C2 4.97971 2.14048 4.64057 2.39052 4.39052C2.64057 4.14048 2.97971 4 3.33333 4H7.33333M10 2H14M14 2V6M14 2L6.66667 9.33333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</a>
						{/each}
					</div>
				{/if}
			</header>

			<section class="content">
				{#if project.screenshotPaths.length > 0}
					<div class="screenshots">
						<h2>스크린샷</h2>
						<ScreenshotCarousel screenshots={project.screenshotPaths} />
					</div>
				{/if}
			</section>
		</div>
	{/if}
</main>

<style>
	main {
		min-height: 100vh;
		color: var(--text);
		padding: 5.25rem 2rem;
	}

	.container {
		max-width: 900px;
		margin: 0 auto;
		position: relative;
	}

	.back-button {
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text);
		text-decoration: none;
		font-size: 1rem;
		transition: opacity 0.2s ease;
		letter-spacing: 0.05em;
	}

	.back-button:hover {
		opacity: 0.7;
	}

	header {
		text-align: center;
		padding: 5rem 0 3rem;
		border-bottom: 1px solid var(--border);
		margin-bottom: 3rem;
	}

	.logo-container {
		width: 200px;
		height: 200px;
		margin: 0 auto 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.project-logo {
		width: 100%;
		height: 100%;
		object-fit: contain;
		border-radius: 18px;
	}

	h1 {
		font-size: 3rem;
		font-weight: 300;
		margin: 0 0 1.5rem 0;
		letter-spacing: 0.05em;
	}

	.tags {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.tag {
		background-color: var(--bg-lighter);
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.9rem;
		letter-spacing: 0.05em;
	}

	.date-info {
		color: var(--text-tertiary);
		font-size: 0.95rem;
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.links {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.link-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background-color: var(--bg-lighter);
		color: var(--text);
		text-decoration: none;
		border-radius: 8px;
		font-size: 0.95rem;
		letter-spacing: 0.05em;
		transition: all 0.2s ease;
		border: 1px solid var(--border);
	}

	.link-button:hover {
		background-color: var(--bg);
		transform: translateY(-2px);
	}

	.content {
		padding: 2rem 0;
	}

	.screenshots {
		margin-top: 3rem;
	}

	.screenshots h2 {
		font-size: 1.8rem;
		font-weight: 300;
		margin-bottom: 2rem;
		letter-spacing: 0.05em;
		text-align: center;
	}

	@media (max-width: 768px) {
		main {
			padding-top: 3rem;
		}

		h1 {
			font-size: 2rem;
		}

		.logo-container {
			width: 150px;
			height: 150px;
		}

		header {
			padding: 4rem 0 3rem;
		}

		.back-button {
			font-size: 0.9rem;
		}
	}
</style>

