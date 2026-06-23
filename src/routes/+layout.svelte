<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import CustomScrollbar from '$lib/components/CustomScrollbar.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import MusicPlayerPill from '$lib/components/MusicPlayerPill.svelte';
	import { pathWithBase, hrefBlogPathname, hrefProjectsPathname } from '$lib/appPaths';
	import { absoluteUrl } from '$lib/seo';
	import { BlogIcon, LogoIcon, MoonIcon, SunIcon } from '$lib/components/icons';
	import { MAIN_SCROLL_KEY, type MainScrollContext } from '$lib/scrollContext';
	import { music } from '$lib/stores/music.svelte';
	import { navigating } from '$lib/stores/navigating.svelte';
	import 'highlight.js/styles/github-dark-dimmed.css';
	import { onMount, setContext } from 'svelte';
	import { fade } from 'svelte/transition';

	let { children, data } = $props();

	function isPrivateSeoPath(pathname: string): boolean {
		return (
			pathname.startsWith('/admin') ||
			pathname.startsWith('/account') ||
			pathname.startsWith('/login') ||
			pathname.startsWith('/signup') ||
			pathname.startsWith('/logout')
		);
	}

	const headSeo = $derived.by(() => {
		const d = data.seoDefaults;
		if (!d) return null;
		const pathname = $page.url.pathname;
		const payload = $page.data.seo ?? {};
		const priv = isPrivateSeoPath(pathname);
		const title =
			pathname === '/'
				? d.siteName
				: payload.title
					? `${payload.title} · ${d.siteName}`
					: d.siteName;
		const description = (payload.description ?? d.defaultDescription).trim();
		const path = payload.canonicalPath ?? pathname;
		const canonical = absoluteUrl(d.siteUrl, path);
		const ogType = payload.type ?? 'website';
		const robots = payload.robots ?? (priv ? 'noindex, nofollow' : undefined);
		const imgSrc = payload.ogImage ?? d.defaultOgImagePath;
		const ogImage = absoluteUrl(d.siteUrl, imgSrc);
		return {
			title,
			description,
			canonical,
			ogType,
			robots,
			ogImage,
			siteName: d.siteName,
			locale: d.locale,
			publishedTime: payload.publishedTime,
			modifiedTime: payload.modifiedTime
		};
	});

	const logoutFormAction = `${resolve('/logout')}?/`;

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
	let showAuthPanel = $state(false);

	// 외부 클릭 시 auth 패널 닫기
	$effect(() => {
		if (!browser) return;

		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Element;
			// auth 패널이나 버튼 내부를 클릭한 경우 무시
			if (showAuthPanel && !target.closest('.auth-panel') && !target.closest('.nav-account-btn')) {
				showAuthPanel = false;
			}
		}

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	let isDark = $state(true);

	// 마지막 방문 경로 저장을 위한 상태
	let lastBlogPath = $state('/blog');

	const themes = {
		dark: {
			'--bg': '#222222',
			'--bg-lighter': '#2b2d30',
			'--text': '#ffffff',
			'--text-secondary': '#cccccc',
			'--text-tertiary': '#808080',
			'--border': '#505050',
			'--accent': '#ffffff',
			'--img-filter': 'none',
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
			goto(resolve(rootPath as '/blog' | '/projects'));
		} else if (lastPath.startsWith('/blog')) {
			goto(hrefBlogPathname(lastPath));
		} else if (lastPath.startsWith('/projects')) {
			goto(hrefProjectsPathname(lastPath));
		} else {
			goto(pathWithBase(lastPath));
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

		if (savedBlogPath) {
			lastBlogPath = savedBlogPath;
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

	// 라우트 전환 시작/완료 감지 — 0.2s 초과 이동에서만 로딩 오버레이 표시.
	// 메모리 즉시 이동은 200ms 전에 끝나 타이머가 취소되므로 깜빡임 없음.
	let navOverlayTimer: ReturnType<typeof setTimeout> | null = null;

	beforeNavigate(() => {
		if (navOverlayTimer) clearTimeout(navOverlayTimer);
		navOverlayTimer = setTimeout(() => {
			navigating.navigating = true;
			navOverlayTimer = null;
		}, 200);
	});

	afterNavigate(() => {
		if (navOverlayTimer) {
			clearTimeout(navOverlayTimer);
			navOverlayTimer = null;
		}
		navigating.navigating = false;
		if (browser && mainScrollEl) {
			mainScrollEl.scrollTop = 0;
		}
	});
</script>

<svelte:head>
	<meta name="naver-site-verification" content="258f4fc55757d4d5d2442b1d94851ca87fe5e029" />
	{#if headSeo}
		<title>{headSeo.title}</title>
		<meta name="description" content={headSeo.description} />
		<link rel="canonical" href={headSeo.canonical} />
		{#if headSeo.robots}
			<meta name="robots" content={headSeo.robots} />
		{/if}
		<meta property="og:site_name" content={headSeo.siteName} />
		<meta property="og:title" content={headSeo.title} />
		<meta property="og:description" content={headSeo.description} />
		<meta property="og:url" content={headSeo.canonical} />
		<meta property="og:type" content={headSeo.ogType} />
		<meta property="og:locale" content={headSeo.locale} />
		<meta property="og:image" content={headSeo.ogImage} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={headSeo.title} />
		<meta name="twitter:description" content={headSeo.description} />
		<meta name="twitter:image" content={headSeo.ogImage} />
		{#if headSeo.publishedTime}
			<meta property="article:published_time" content={headSeo.publishedTime} />
		{/if}
		{#if headSeo.modifiedTime}
			<meta property="article:modified_time" content={headSeo.modifiedTime} />
		{/if}
	{/if}
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="icon" href="/favicon.ico" sizes="32x32" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&amp;family=IBM+Plex+Sans+KR:wght@400;500;600;700&amp;display=swap"
	/>
</svelte:head>

<div class="app">
	<CustomScrollbar />
	<LoadingOverlay />

	<header class="site-header">
		<nav class="nav-container">
			<div class="nav-left"></div>
			<div class="nav-center">
				<div
					class="nav-tooltip-wrapper"
					role="none"
					onmouseenter={() => (navHovered = 'home')}
					onmouseleave={() => (navHovered = null)}
				>
					<a
						href={resolve('/')}
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
						href={hrefBlogPathname(lastBlogPath)}
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

				<!-- TODO: 프로젝트 내비 — 구현 후 아래 주석 해제 (ProjectIcon import 추가)
				<div class="nav-tooltip-wrapper" role="none" ...>
					<a href={resolve('/projects')} ...><ProjectIcon /></a>
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
			</div>

			<div class="nav-auth-outer">
				<div
					class="nav-tooltip-wrapper"
					role="none"
					onmouseenter={() => (navHovered = 'auth')}
					onmouseleave={() => (navHovered = null)}
				>
					{#if data.user}
						<button
							type="button"
							class="nav-account-btn"
							class:entering={isMounted}
							class:default={isAnimationDone}
							class:active={showAuthPanel}
							aria-label="계정 메뉴"
							onclick={(e) => {
								e.stopPropagation();
								showAuthPanel = !showAuthPanel;
							}}
						>
							<span class="account-initial">{(data.user.email?.[0] ?? '?').toUpperCase()}</span>
						</button>
						{#if showAuthPanel}
							<div class="auth-panel" transition:fade={{ duration: 150 }}>
								<div class="auth-email">{data.user.email}</div>
								<a href={resolve('/admin')} class="auth-admin-btn">관리</a>
								<form method="POST" action={logoutFormAction} use:enhance>
									<button type="submit" class="auth-logout-btn">로그아웃</button>
								</form>
							</div>
						{/if}
					{:else}
						<a
							href={resolve('/login')}
							class="nav-account-btn"
							class:entering={isMounted}
							class:default={isAnimationDone}
							class:active={isActive('/login')}
							aria-label="로그인"
						>
							<span class="account-text">로그인</span>
						</a>
					{/if}
				</div>
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
			'IBM Plex Sans KR', 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui,
			sans-serif;
		--font-mono:
			'IBM Plex Mono', ui-monospace, 'Cascadia Code', 'Segoe UI Mono', 'SFMono-Regular', Menlo,
			Monaco, Consolas, monospace;
		--img-filter: none;
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
		font-family: var(--font-default);
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

	:global(pre, code, kbd, samp) {
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

	/* 본문 영역: 단일 in-flow child가 뷰포트 높이를 쓰게 해 scrollable % 기준을 잡는다. */
	.site-main {
		flex: 1 1 0;
		min-height: 0;
		position: relative;
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
		justify-content: space-between;
		margin: 0 auto;
	}

	.nav-center {
		display: flex;
		gap: 2rem;
		align-items: center;
		justify-content: center;
	}

	.nav-auth-outer {
		display: flex;
		align-items: center;
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

	.nav-account-btn {
		opacity: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		border-radius: 9999px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.82rem;
		font-weight: 500;
		cursor: pointer;
		animation: nav-icon-enter 1s ease forwards;
		transition: all 0.2s ease;
	}

	/* Center nav icons animation delays */
	.nav-center > .nav-tooltip-wrapper:nth-child(1) .nav-icon,
	.nav-center > .nav-tooltip-wrapper:nth-child(1) .theme-toggle {
		animation-delay: 0s;
	}
	.nav-center > .nav-tooltip-wrapper:nth-child(2) .nav-icon {
		animation-delay: 0.1s;
	}
	.nav-center > .nav-tooltip-wrapper:nth-child(3) .theme-toggle {
		animation-delay: 0.2s;
	}

	/* Auth button animation */
	.nav-auth-outer .nav-account-btn {
		animation-delay: 0.3s;
	}

	.nav-account-btn:hover {
		color: var(--text);
	}

	.account-initial {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--border) 35%, transparent);
		font-size: 0.7rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	.account-text {
		padding-left: 0.15rem;
	}

	.auth-panel {
		position: absolute;
		top: calc(100% + 10px);
		right: 0;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 8px 12px;
		min-width: 180px;
		z-index: 200;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.auth-panel::before {
		content: '';
		position: absolute;
		bottom: 100%;
		right: 16px;
		border: 6px solid transparent;
		border-bottom-color: var(--border);
	}

	.auth-email {
		font-size: 0.82rem;
		color: var(--text-secondary);
		padding: 4px 0 8px;
		border-bottom: 1px solid var(--border);
		margin-bottom: 8px;
		word-break: break-all;
	}

	.auth-logout-btn {
		width: 100%;
		font: inherit;
		font-size: 0.82rem;
		padding: 6px 0;
		border: none;
		background: transparent;
		color: var(--text);
		cursor: pointer;
		text-align: left;
		border-radius: 4px;
	}

	.auth-admin-btn {
		width: 100%;
		font: inherit;
		font-size: 0.82rem;
		padding: 6px 0;
		border: none;
		background: transparent;
		color: var(--text);
		cursor: pointer;
		text-align: left;
		border-radius: 4px;
		text-decoration: none;
		display: block;
	}

	.auth-admin-btn:hover {
		background: var(--bg-lighter);
	}

	.auth-logout-btn {
		width: 100%;
		font: inherit;
		font-size: 0.82rem;
		padding: 6px 0;
		border: none;
		background: transparent;
		color: var(--text);
		cursor: pointer;
		text-align: left;
		border-radius: 4px;
	}

	.auth-logout-btn:hover {
		background: var(--bg-lighter);
	}

	/* 전환(out+in) 시 동시에 두 개의 +page 루트(각각 <main>)가 머문다. 동일 셀에 쌓아야
	   트랜지션이 겹쳐 보이고, 세로로 쌓이는 레이아웃 버그가 난다. */
	.site-main > .scrollable > :global(.main-scroll-region) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-content: start;
		align-items: start;
		justify-items: stretch;
	}

	.site-main > .scrollable > :global(.main-scroll-region) > :global(*) {
		grid-row: 1;
		grid-column: 1;
		min-width: 0;
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
