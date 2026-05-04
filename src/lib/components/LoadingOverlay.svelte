<script lang="ts">
	import { navigating } from '$lib/stores/navigating.svelte';
	import { fade } from 'svelte/transition';
</script>

{#if navigating.navigating}
	<div class="loading-overlay" transition:fade={{ duration: 150 }}>
		<div class="spinner-wrapper">
			<div class="spinner"></div>
		</div>
	</div>
{/if}

<style>
	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: color-mix(in srgb, var(--bg) 50%, transparent);
		backdrop-filter: blur(4px);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: auto;
	}

	.spinner-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid color-mix(in srgb, var(--text) 20%, transparent);
		border-top-color: var(--text);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>