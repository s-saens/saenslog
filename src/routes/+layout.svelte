<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import logo from '$lib/assets/logo.svg';

	let { children } = $props();

	// 페이지 순서 정의
	const pageOrder: Record<string, number> = {
		'/': 0,
		'/blog': 1,
		'/projects': 2,
		'/musics': 3
	};

	// 페이지 인덱스 계산
	function getPageIndex(path: string): number {
		if (pageOrder[path] !== undefined) return pageOrder[path];
		for (const [key, value] of Object.entries(pageOrder)) {
			if (path.startsWith(key) && key !== '/') return value;
		}
		return 0;
	}

	// 네비게이션 애니메이션
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		const fromPath = navigation.from?.url.pathname || '/';
		const toPath = navigation.to?.url.pathname || '/';

		const fromIsBlog = fromPath.startsWith('/blog');
		const toIsBlog = toPath.startsWith('/blog');

		// 블로그 내부 네비게이션인 경우
		if (fromIsBlog && toIsBlog) {
			// 포스트로 들어가는지 확인 (경로가 숫자로 끝나는지)
			const toSegments = toPath.split('/').filter(Boolean);
			const lastSegment = toSegments[toSegments.length - 1];
			const isGoingToPost = /^\d+$/.test(lastSegment);

			if (isGoingToPost) {
				// 포스트로 들어갈 때: 페이드
				document.documentElement.setAttribute('data-transition', 'fade');
			} else {
				// 블로그 내 폴더 간 이동: 트랜지션 없음
				document.documentElement.setAttribute('data-transition', 'none');
				return;
			}
		} else {
			// 다른 페이지 간 전환: 슬라이드
			const fromIndex = getPageIndex(fromPath);
			const toIndex = getPageIndex(toPath);
			const direction = toIndex > fromIndex ? 1 : -1;

			document.documentElement.style.setProperty('--slide-direction', direction.toString());
			document.documentElement.setAttribute('data-transition', 'slide');
		}

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// 현재 경로 확인을 위한 helper
	function isActive(path: string) {
		return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Saens.kr - 블로그 & 포트폴리오</title>
</svelte:head>

<div class="app">
	<header class="site-header">
		<nav class="nav-container">
			<a href="/" class="nav-icon" class:active={isActive('/')} title="Home">
				<img src={logo} alt="Home" />
			</a>
			<a href="/blog" class="nav-icon" class:active={isActive('/blog')} title="Blog">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
					<polyline points="14 2 14 8 20 8"/>
					<line x1="16" y1="13" x2="8" y2="13"/>
					<line x1="16" y1="17" x2="8" y2="17"/>
					<polyline points="10 9 9 9 8 9"/>
				</svg>
			</a>
			<a href="/projects" class="nav-icon" class:active={isActive('/projects')} title="Projects">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
				</svg>
			</a>
			<a href="/musics" class="nav-icon" class:active={isActive('/musics')} title="Music">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 18V5l12-2v13"/>
					<circle cx="6" cy="18" r="3"/>
					<circle cx="18" cy="16" r="3"/>
				</svg>
			</a>
		</nav>
	</header>

	<main class="site-main">
		{@render children()}
	</main>
</div>

<style>
	:global(:root) {
		/* Color Palette */
		--bg: #222222;
		--bg-lighter: #2b2d30;
		--text: #ffffff;
		--text-secondary: #cccccc;
		--text-tertiary: #808080;
		--border: #505050;
		--accent: #ffffff;
		
		/* Fonts */
		--font-mono: 'IBM Plex Mono', 'Courier New', monospace;
		
		/* Animation */
		--slide-direction: 1;
	}

	/* 슬라이드 애니메이션 */
	@keyframes slide-out {
		to {
			transform: translateX(calc(var(--slide-direction) * -100vw));
		}
	}

	@keyframes slide-in {
		from {
			transform: translateX(calc(var(--slide-direction) * 100vw));
		}
	}

	/* 페이드 애니메이션 */
	@keyframes fade-out {
		to {
			opacity: 0;
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	/* 헤더는 항상 고정 */
	::view-transition-old(header),
	::view-transition-new(header) {
		animation: none;
	}

	/* 슬라이드 트랜지션 (페이지 간 이동) */
	:root[data-transition="slide"] ::view-transition-old(main) {
		animation: slide-out 0.5s ease-in-out;
	}

	:root[data-transition="slide"] ::view-transition-new(main) {
		animation: slide-in 0.5s ease-in-out;
	}

	/* 페이드 트랜지션 (포스트 진입) */
	:root[data-transition="fade"] ::view-transition-old(main) {
		animation: fade-out 0.3s ease-out;
	}

	:root[data-transition="fade"] ::view-transition-new(main) {
		animation: fade-in 0.3s ease-in;
	}

	/* 트랜지션 없음 (블로그 내 폴더 이동) */
	:root[data-transition="none"] ::view-transition-old(main),
	:root[data-transition="none"] ::view-transition-new(main) {
		animation: none;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: var(--font-mono);
		color: var(--text);
		background-color: var(--bg);
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
		view-transition-name: header;
		background-color: rgba(34, 34, 34, 0.3);
		backdrop-filter: blur(8px) saturate(110%);
		-webkit-backdrop-filter: blur(12px) saturate(180%);
		padding: 1rem 2rem;
	}

	.nav-container {
		display: flex;
		gap: 2rem;
		align-items: center;
		justify-content: center;
		max-width: 1200px;
		margin: 0 auto;
	}

	.nav-icon {
		color: var(--text-tertiary);
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-icon img {
		width: 24px;
		height: 24px;
		opacity: 0.5;
		transition: opacity 0.3s ease;
	}

	.nav-icon:hover,
	.nav-icon.active {
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
		view-transition-name: main;
	}

	@media (max-width: 768px) {
		.site-header {
			padding: 0.75rem 1rem;
		}

		.nav-container {
			gap: 1rem;
		}

		.nav-icon svg,
		.nav-icon img {
			width: 20px;
			height: 20px;
		}
	}
</style>
