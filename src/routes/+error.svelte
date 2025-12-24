<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';
</script>

<main>
	<div class="error-container" transition:fade={{ duration: 500 }}>
		<div class="error-code" transition:fly={{ duration: 600, y: -30, delay: 100 }}>
			{page.status}
		</div>
		<div class="error-message" transition:fly={{ duration: 600, y: 30, delay: 200 }}>
			{page.error?.message || 'Something went wrong'}
		</div>
		<a href={resolve('/blog')} class="back-link" transition:fade={{ duration: 400, delay: 400 }}>
			← Back to Blog
		</a>
	</div>
</main>

<style>
	main {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2rem;
	}

	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
	}

	.error-code {
		font-size: 6rem;
		font-weight: 700;
		color: var(--text);
		line-height: 1;
		letter-spacing: -0.05em;
		opacity: 0.9;
	}

	.error-message {
		font-size: 1.25rem;
		color: var(--text-tertiary);
		font-weight: 400;
		max-width: 400px;
	}

	.back-link {
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		color: var(--text-secondary);
		text-decoration: none;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 0.9rem;
		transition: all 0.2s ease;
	}

	.back-link:hover {
		color: var(--text);
		border-color: var(--text-tertiary);
		background-color: var(--bg-lighter);
	}

	@media (max-width: 768px) {
		.error-code {
			font-size: 4rem;
		}

		.error-message {
			font-size: 1rem;
		}
	}
</style>

