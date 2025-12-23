<script lang="ts">
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
			};
		};
	}

	let { data }: Props = $props();
	let project = data.project;
</script>

<main>
	<div class="container">
		<header>
			<div class="logo-container">
				<img src={project.logoPath} alt={`${project.title} 로고`} class="project-logo" />
			</div>
			<h1>{project.title}</h1>
			<div class="tags">
				{#each project.tags as tag}
					<span class="tag">{tag}</span>
				{/each}
			</div>
			<div class="date-info">
				<span>{project.startDate}</span>
				<span>-</span>
				<span>{project.endDate}</span>
			</div>
		</header>

		<section class="content">
			<p class="placeholder">프로젝트 상세 내용이 여기에 표시됩니다.</p>
			
			{#if project.screenshotPaths.length > 0}
				<div class="screenshots">
					<h2>스크린샷</h2>
					<div class="screenshot-grid">
						{#each project.screenshotPaths as screenshot}
							<img src={screenshot} alt="스크린샷" class="screenshot" />
						{/each}
					</div>
				</div>
			{/if}
		</section>
	</div>
</main>

<style>
	main {
		min-height: 100vh;
		color: var(--text);
		padding: 2rem;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	header {
		text-align: center;
		padding: 3rem 0;
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
		border-radius: 50%;
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
	}

	.content {
		padding: 2rem 0;
	}

	.placeholder {
		text-align: center;
		color: var(--text-secondary);
		font-size: 1.1rem;
		margin: 3rem 0;
	}

	.screenshots {
		margin-top: 3rem;
	}

	.screenshots h2 {
		font-size: 1.8rem;
		font-weight: 300;
		margin-bottom: 2rem;
		letter-spacing: 0.05em;
	}

	.screenshot-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
	}

	.screenshot {
		width: 100%;
		height: auto;
		border-radius: 8px;
		border: 1px solid var(--border);
	}

	@media (max-width: 768px) {
		h1 {
			font-size: 2rem;
		}

		.logo-container {
			width: 150px;
			height: 150px;
		}

		.screenshot-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

