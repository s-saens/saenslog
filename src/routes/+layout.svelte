<script lang="ts">
	import { page } from '$app/stores';
	import blogIcon from '$lib/assets/blog.svg';
	import logo from '$lib/assets/logo.svg';
	import musicIcon from '$lib/assets/music.svg';
	import projectIcon from '$lib/assets/project.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

	let isMounted = $state(false);
	let isAnimationDone = $state(false);

	function isActive(path: string) {
		return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
	}

	onMount(() => {
		isMounted = true;
	});

</script>

<svelte:head>
	<link rel="icon" href={logo} />
	<title>SAENS</title>
</svelte:head>

<div class="app">
	<header class="site-header">
		<nav class="nav-container">
			<a href="/" class="nav-icon" class:entering={isMounted} class:default={isAnimationDone} class:active={isActive('/')} title="Home">
				<img src={logo} alt="Home" />
			</a>
			<a href="/blog" class="nav-icon" class:entering={isMounted} class:default={isAnimationDone} class:active={isActive('/blog')} title="Blog">
				<img src={blogIcon} alt="Blog" />
			</a>
			<a href="/projects" class="nav-icon" class:entering={isMounted} class:default={isAnimationDone} class:active={isActive('/projects')} title="Projects">
				<img src={projectIcon} alt="Projects" />
			</a>
			<a href="/musics" class="nav-icon" class:entering={isMounted} class:default={isAnimationDone} class:active={isActive('/musics')} title="Music">
				<img src={musicIcon} alt="Music" />
			</a>
		</nav>
	</header>

	<main class="site-main">
		{@render children()}
	</main>
</div>

<style>
	:global(:root) {
		--bg: #222222;
		--bg-lighter: #2b2d30;
		--text: #ffffff;
		--text-secondary: #cccccc;
		--text-tertiary: #808080;
		--border: #505050;
		--accent: #ffffff;
		--font-mono: 'IBM Plex Mono', monospace;
	}

	@keyframes app-enter {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.app {
		animation: app-enter 1s ease forwards;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: var(--font-mono);
		color: var(--text);
		background-color: var(--bg);
		user-select: none;
		-webkit-user-select: none;
	}

	:global(body *) {
		font-family: var(--font-mono);
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.site-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		z-index: 100;
		background-color: rgba(34, 34, 34, 0.3);
		backdrop-filter: blur(8px) saturate(110%);
		-webkit-backdrop-filter: blur(12px) saturate(180%);
		padding: 1rem 2rem;
	}

	@keyframes nav-icon-enter {
		from {
			opacity: 0;
			transform: scale(0) rotate(-180deg);
		}
		to {
			opacity: 1;
			transform: scale(1) rotate(0deg) ;
		}
	}

	.nav-container {
		display: flex;
		gap: 2rem;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
	}

	.nav-icon {
		opacity: 0;
		color: var(--text-tertiary);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: nav-icon-enter 1s ease forwards;
	}

	.nav-icon:nth-child(1) {
		animation-delay: 0s;
	}
	.nav-icon:nth-child(2) {
		animation-delay: 0.1s;
	}
	.nav-icon:nth-child(3) {
		animation-delay: 0.2s;
	}
	.nav-icon:nth-child(4) {
		animation-delay: 0.3s;
	}
	
	.nav-icon img {
		width: 24px;
		height: 24px;
		opacity: 0.5;
		transition: opacity 0.5s ease;
	}

	.nav-icon:hover, .nav-icon {
		color: var(--text);
	}

	.nav-icon:hover img,
	.nav-icon.active img {
		opacity: 1;
	}

	.site-main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		animation: site-main-enter 1s ease forwards;
	}

	@media (max-width: 768px) {
		.site-header {
			padding: 0.75rem 1rem;
		}

		.nav-container {
			gap: 1rem;
		}

		.nav-icon img {
			width: 20px;
			height: 20px;
		}
	}
</style>
