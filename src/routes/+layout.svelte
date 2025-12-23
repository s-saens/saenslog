<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { BlogIcon, LogoIcon, MoonIcon, MusicIcon, ProjectIcon, SunIcon } from '$lib/components/icons';
	import { onMount } from 'svelte';

	let { children } = $props();

	let isMounted = $state(false);
	let isAnimationDone = $state(false);

	let isDark = $state(true);

	// 마지막 방문 경로 저장을 위한 상태
	let lastBlogPath = $state('/blog');
	let lastProjectPath = $state('/projects');

	const themes = {
		dark: {
			'--bg': '#222222',
			'--bg-lighter': '#2b2d30',
			'--text': '#ffffff',
			'--text-secondary': '#cccccc',
			'--text-tertiary': '#808080',
			'--border': '#505050',
			'--accent': '#ffffff'
		},
		light: {
			'--bg': '#f5f5f5',
			'--bg-lighter': '#ffffff',
			'--text': '#1a1a1a',
			'--text-secondary': '#444444',
			'--text-tertiary': '#888888',
			'--border': '#d0d0d0',
			'--accent': '#1a1a1a'
		}
	};

	function applyTheme(dark: boolean) {
		if (!browser) return;
		const theme = dark ? themes.dark : themes.light;
		for (const [key, value] of Object.entries(theme)) {
			document.documentElement.style.setProperty(key, value);
		}
	}

	function toggleTheme() {
		isDark = !isDark;
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		applyTheme(isDark);
	}

	function isActive(path: string) {
		return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
	}

	// 네비게이션 핸들러
	function handleNavigation(e: MouseEvent, rootPath: string, lastPath: string) {
		e.preventDefault();
		const currentPath = $page.url.pathname;
		
		// 현재 같은 섹션에 있으면 루트로, 아니면 마지막 방문 경로로
		if (currentPath.startsWith(rootPath)) {
			goto(rootPath);
		} else {
			goto(lastPath);
		}
	}

	// 경로 변경 감지 및 저장
	$effect(() => {
		if (!browser) return;

		const currentPath = $page.url.pathname;

		// blog 경로 저장 - localStorage만 업데이트
		if (currentPath.startsWith('/blog')) {
			localStorage.setItem('lastBlogPath', currentPath);
		}

		// projects 경로 저장 (목록 페이지는 제외)
		if (currentPath.startsWith('/projects')) {
			localStorage.setItem('lastProjectPath', currentPath);
		}
	});

	// 현재 경로에 기반한 derived 값
	$effect(() => {
		const currentPath = $page.url.pathname;
		
		// blog 경로면 현재 경로로 업데이트
		if (currentPath.startsWith('/blog')) {
			lastBlogPath = currentPath;
		}
		
		// projects 경로면 현재 경로로 업데이트
		if (currentPath.startsWith('/projects/')) {
			lastProjectPath = currentPath;
		}
	});

	onMount(() => {
		isMounted = true;

		// 1. localStorage에서 저장된 테마 확인
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			isDark = savedTheme === 'dark';
		} else {
			// 2. 시스템 설정 확인
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		applyTheme(isDark);

		// 저장된 경로 불러오기
		const savedBlogPath = localStorage.getItem('lastBlogPath');
		const savedProjectPath = localStorage.getItem('lastProjectPath');
		
		if (savedBlogPath) {
			lastBlogPath = savedBlogPath;
		}
		if (savedProjectPath) {
			lastProjectPath = savedProjectPath;
		}

		// 시스템 테마 변경 감지 (저장된 테마가 없을 때만)
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => {
			if (!localStorage.getItem('theme')) {
				isDark = e.matches;
				applyTheme(isDark);
			}
		};
		mediaQuery.addEventListener('change', handleChange);

		return () => mediaQuery.removeEventListener('change', handleChange);
	});

</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" />
	<title>SAENS</title>
</svelte:head>

<div class="app">
	<header class="site-header">
		<nav class="nav-container">
			<a href="/" class="nav-icon" class:entering={isMounted} class:default={isAnimationDone} class:active={isActive('/')} title="Home">
				<LogoIcon width={24} height={24} />
			</a>
			<a 
				href={lastBlogPath} 
				class="nav-icon" 
				class:entering={isMounted} 
				class:default={isAnimationDone} 
				class:active={isActive('/blog')} 
				title="Blog"
				onclick={(e) => handleNavigation(e, '/blog', lastBlogPath)}
			>
				<BlogIcon />
			</a>
			<a 
				href={lastProjectPath} 
				class="nav-icon" 
				class:entering={isMounted} 
				class:default={isAnimationDone} 
				class:active={isActive('/projects')} 
				title="Projects"
				onclick={(e) => handleNavigation(e, '/projects', lastProjectPath)}
			>
				<ProjectIcon />
			</a>
			<a href="/musics" class="nav-icon" class:entering={isMounted} class:default={isAnimationDone} class:active={isActive('/musics')} title="Music">
				<MusicIcon />
			</a>
			<button class="theme-toggle nav-icon" class:entering={isMounted} onclick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
				{#if isDark}
					<SunIcon />
				{:else}
					<MoonIcon />
				{/if}
			</button>
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
		--font-default: 'IBM Plex Sans KR', 'Noto Sans KR', sans-serif;
		--font-mono: 'IBM Plex Mono', monospace;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: var(--font-mono);
		color: var(--text);
		background-color: var(--bg);
		user-select: none;
		-webkit-user-select: none;
		transition: background-color 0.3s ease, color 0.3s ease;
	}

	:global(body *) {
		font-family: var(--font-mono);
	}

	:global(*) {
		box-sizing: border-box;
		transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, stroke 0.3s ease, fill 0.3s ease;
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
		padding: 1rem 1.5rem;
		background-color: color-mix(in srgb, var(--bg) 30%, transparent);
		backdrop-filter: blur(8px) saturate(140%);
		transition: background-color 0.3s ease;
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
	.nav-icon:nth-child(5) {
		animation-delay: 0.4s;
	}
	
	.nav-icon :global(svg) {
		width: 24px;
		height: 24px;
		opacity: 0.5;
		transition: opacity 0.5s ease;
	}

	.nav-icon:hover, .nav-icon {
		color: var(--text);
	}

	.nav-icon:hover :global(svg),
	.nav-icon.active :global(svg) {
		opacity: 1;
	}

	.theme-toggle {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		color: var(--text-tertiary);
		transition: color 0.3s ease;
	}

	.theme-toggle:hover {
		color: var(--text);
	}

	.theme-toggle :global(svg) {
		opacity: 0.5;
		transition: opacity 0.3s ease;
	}

	.theme-toggle:hover :global(svg) {
		opacity: 1;
	}

	.site-main > :global(*) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow-y: auto;
	}

	@media (max-width: 768px) {
		.site-header {
			padding: 0.75rem 1rem;
		}

		.nav-container {
			gap: 1rem;
		}

		.nav-icon :global(svg) {
			width: 20px;
			height: 20px;
		}
	}
</style>
