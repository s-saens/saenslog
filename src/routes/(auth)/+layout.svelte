<script lang="ts">
	let { children } = $props();
</script>

<div class="auth-shell">
	<div class="auth-card">
		{@render children()}
	</div>
</div>

<style>
	.auth-shell {
		min-height: calc(100vh - var(--site-header-height));
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem calc(2rem + env(safe-area-inset-bottom, 0));
	}

	.auth-card {
		width: 100%;
		max-width: 22rem;
		padding: 1.75rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: color-mix(in srgb, var(--bg-lighter) 85%, transparent);
	}
</style>
