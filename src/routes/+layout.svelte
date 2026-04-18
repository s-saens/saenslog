<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CustomScrollbar from '$lib/components/CustomScrollbar.svelte';
	import MusicPlayerPill from '$lib/components/MusicPlayerPill.svelte';
	import { BlogIcon, LogoIcon, MoonIcon, SunIcon } from '$lib/components/icons';
	import { MAIN_SCROLL_KEY, type MainScrollContext } from '$lib/scrollContext';
	import { music } from '$lib/stores/music.svelte';
	import 'highlight.js/styles/github-dark-dimmed.css';
	import { onMount, setContext } from 'svelte';
	import { fade } from 'svelte/transition';

	let { children, data } = $props();

	/** 메인 스크롤 영역 — 스크롤바·TOC·afterNavigate가 공유 */
	let mainScrollEl = $state<HTMLElement | null>(null);

	setContext<MainScrollContext>(MAIN_SCROLL_KEY, {
		get scrollRoot() {
			return mainScrollEl;
		}
	});

	$effect.pre(() => {
		if (data.tracks.length > 0) {
			music.tracks = data.tracks;
		}
	});

	let isMounted = $state(false);
	let isAnimationDone = $state(false);
	let navHovered = $state<string | null>(null);

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
			'--accent': '#ffffff',
			'--img-filter': 'invert(1)',
			'--code-bg': '#1e2228'
		},
		light: {
			'--bg': '#f5f5f5',
			'--bg-lighter': '#ffffff',
			'--text': '#1a1a1a',
			'--text-secondary': '#666666',
			'--text-tertiary': '#aaaaaa',
			'--border': '#d0d0d0',
			'--accent': '#1a1a1a',
			'--img-filter': 'none',
			'--code-bg': '#f6f8fa'
		}
	};

	function applyTheme(dark: boolean) {
		if (!browser) return;
		const theme = dark ? themes.dark : themes.light;
		for (const [key, value] of Object.entries(theme)) {
			document.documentElement.style.setProperty(key, value);
		}
		document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
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

	// 경로 변경 시 sessionStorage + 내비용 마지막 경로 동기화
	$effect(() => {
		if (!browser) return;

		const currentPath = $page.url.pathname;

		if (currentPath.startsWith('/blog')) {
			sessionStorage.setItem('lastBlogPath', currentPath);
			lastBlogPath = currentPath;
		}

		if (currentPath.startsWith('/projects')) {
			sessionStorage.setItem('lastProjectPath', currentPath);
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

		const savedBlogPath = sessionStorage.getItem('lastBlogPath');
		const savedProjectPath = sessionStorage.getItem('lastProjectPath');

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

	afterNavigate(() => {
		if (browser && mainScrollEl) {
			mainScrollEl.scrollTop = 0;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" />
	<title>SAENS</title>
</svelte:head>

<div class="app">
	<CustomScrollbar />

	<header class="site-header">
		<nav class="nav-container">
			<div
				class="nav-tooltip-wrapper"
				role="none"
				onmouseenter={() => (navHovered = 'home')}
				onmouseleave={() => (navHovered = null)}
			>
				<a
					href="/"
					class="nav-icon"
					class:entering={isMounted}
					class:default={isAnimationDone}
					class:active={isActive('/')}
				>
					<LogoIcon width={24} height={24} />
				</a>
				{#if navHovered === 'home'}
					<div class="nav-tooltip" transition:fade={{ duration: 150 }}>Home</div>
				{/if}
			</div>

			<div
				class="nav-tooltip-wrapper"
				role="none"
				onmouseenter={() => (navHovered = 'blog')}
				onmouseleave={() => (navHovered = null)}
			>
				<a
					href={lastBlogPath}
					class="nav-icon"
					class:entering={isMounted}
					class:default={isAnimationDone}
					class:active={isActive('/blog')}
					onclick={(e) => handleNavigation(e, '/blog', lastBlogPath)}
				>
					<BlogIcon />
				</a>
				{#if navHovered === 'blog'}
					<div class="nav-tooltip" transition:fade={{ duration: 150 }}>Blog</div>
				{/if}
			</div>

			<!-- TODO : 프로젝트 페이지 제대로 구현 후 주석 해제
			<div
				class="nav-tooltip-wrapper"
				role="none"
				onmouseenter={() => (navHovered = 'projects')}
				onmouseleave={() => (navHovered = null)}
			>
				<a
					href={lastProjectPath}
					class="nav-icon"
					class:entering={isMounted}
					class:default={isAnimationDone}
					class:active={isActive('/projects')}
					onclick={(e) => handleNavigation(e, '/projects', lastProjectPath)}
				>
					<ProjectIcon />
				</a>
				{#if navHovered === 'projects'}
					<div class="nav-tooltip" transition:fade={{ duration: 150 }}>Projects</div>
				{/if}
			</div>
			-->

			<div
				class="nav-tooltip-wrapper"
				role="none"
				onmouseenter={() => (navHovered = 'theme')}
				onmouseleave={() => (navHovered = null)}
			>
				<button class="theme-toggle nav-icon" class:entering={isMounted} onclick={toggleTheme}>
					{#if isDark}
						<SunIcon />
					{:else}
						<MoonIcon />
					{/if}
				</button>
				{#if navHovered === 'theme'}
					<div class="nav-tooltip" transition:fade={{ duration: 150 }}>
						{isDark ? 'Turn to light mode' : 'Turn to dark mode'}
					</div>
				{/if}
			</div>
		</nav>
	</header>

	<main class="site-main">
		<div class="scrollable">
			<div id="main-content" class="main-scroll-region" bind:this={mainScrollEl}>
				{@render children()}
			</div>
		</div>
	</main>

	<MusicPlayerPill />
</div>

<style>
	:global(:root) {
		/* 고정 네비 높이 + 노치 — 본문 패딩·풀뷰포트 섹션에서 공통 사용 */
		--site-header-height: calc(5.25rem + env(safe-area-inset-top, 0px));
		--bg: #222222;
		--bg-lighter: #2b2d30;
		--text: #ffffff;
		--text-secondary: #cccccc;
		--text-tertiary: #808080;
		--border: #505050;
		--accent: #ffffff;
		--font-default:
			'IBM Plex Sans KR', 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
		--font-mono: 'IBM Plex Mono', monospace;
		--img-filter: invert(1);
		--code-bg: #1e2228;
	}

	/* 라이트 모드 highlight.js 오버라이드 */
	:global([data-theme='light'] .hljs) {
		background: #f6f8fa;
		color: #24292e;
	}
	:global([data-theme='light'] .hljs-doctag),
	:global([data-theme='light'] .hljs-keyword),
	:global([data-theme='light'] .hljs-meta .hljs-keyword),
	:global([data-theme='light'] .hljs-template-tag),
	:global([data-theme='light'] .hljs-template-variable),
	:global([data-theme='light'] .hljs-type),
	:global([data-theme='light'] .hljs-variable.language_) {
		color: #d73a49;
	}
	:global([data-theme='light'] .hljs-title),
	:global([data-theme='light'] .hljs-title.class_),
	:global([data-theme='light'] .hljs-title.class_.inherited__),
	:global([data-theme='light'] .hljs-title.function_) {
		color: #6f42c1;
	}
	:global([data-theme='light'] .hljs-attr),
	:global([data-theme='light'] .hljs-attribute),
	:global([data-theme='light'] .hljs-literal),
	:global([data-theme='light'] .hljs-meta),
	:global([data-theme='light'] .hljs-number),
	:global([data-theme='light'] .hljs-operator),
	:global([data-theme='light'] .hljs-variable),
	:global([data-theme='light'] .hljs-selector-attr),
	:global([data-theme='light'] .hljs-selector-class),
	:global([data-theme='light'] .hljs-selector-id) {
		color: #005cc5;
	}
	:global([data-theme='light'] .hljs-regexp),
	:global([data-theme='light'] .hljs-string),
	:global([data-theme='light'] .hljs-meta .hljs-string) {
		color: #032f62;
	}
	:global([data-theme='light'] .hljs-built_in),
	:global([data-theme='light'] .hljs-symbol) {
		color: #e36209;
	}
	:global([data-theme='light'] .hljs-comment),
	:global([data-theme='light'] .hljs-code),
	:global([data-theme='light'] .hljs-formula) {
		color: #6a737d;
	}
	:global([data-theme='light'] .hljs-name),
	:global([data-theme='light'] .hljs-quote),
	:global([data-theme='light'] .hljs-selector-tag),
	:global([data-theme='light'] .hljs-selector-pseudo) {
		color: #22863a;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: var(--font-mono);
		color: var(--text);
		background-color: var(--bg);
		user-select: none;
		-webkit-user-select: none;
		transition:
			background-color 0.3s ease,
			color 0.3s ease;
	}

	/* 스크롤바 숨기기 */
	:global(*::-webkit-scrollbar) {
		display: none;
	}

	/* Firefox 스크롤바 숨기기 */
	:global(*) {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	:global(body *) {
		font-family: var(--font-mono);
	}

	:global(*) {
		box-sizing: border-box;
		transition:
			background-color 0.3s ease,
			color 0.3s ease,
			border-color 0.3s ease,
			stroke 0.3s ease,
			fill 0.3s ease;
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
			transform: scale(1) rotate(0deg);
		}
	}

	.nav-container {
		display: flex;
		gap: 2rem;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
	}

	.nav-tooltip-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-tooltip {
		position: absolute;
		top: calc(100% + 10px);
		left: 50%;
		transform: translateX(-50%);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 6px 10px;
		white-space: nowrap;
		font-size: 0.78rem;
		color: var(--text);
		pointer-events: none;
		z-index: 200;
	}

	.nav-tooltip::before {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 5px solid transparent;
		border-bottom-color: var(--border);
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

	.nav-icon :global(svg) {
		width: 24px;
		height: 24px;
		opacity: 0.5;
		transition: opacity 0.5s ease;
	}

	.nav-icon:hover,
	.nav-icon {
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

	.site-main > .scrollable > :global(.main-scroll-region) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow-y: auto;
	}

	.site-main > .scrollable {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow-y: hidden;
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
