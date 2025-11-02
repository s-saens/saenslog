<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { generateSEOTags } from '$lib/seo';
	import { generateWebsiteSchema } from '$lib/json-ld';
	import { page } from '$app/stores';

	let { children } = $props();

	// 현재 페이지 URL 기반 SEO 설정
	const currentUrl = `https://saens.kr${$page.url.pathname}`;
	const seo = generateSEOTags({
		url: currentUrl
	});

	// JSON-LD 구조화된 데이터
	const websiteSchema = generateWebsiteSchema('Saenslog', 'https://saens.kr', 'Saenslog - 개인 블로그');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	
	<!-- 기본 메타 태그 -->
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	
	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={seo.type} />
	<meta property="og:url" content={seo.url} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={seo.image} />
	<meta property="og:site_name" content={seo.siteName} />
	
	<!-- Twitter -->
	<meta name="twitter:card" content={seo.twitterCard} />
	<meta name="twitter:url" content={seo.url} />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={seo.image} />
	
	<!-- Robots -->
	{#if seo.noindex}
		<meta name="robots" content="noindex" />
	{/if}
	{#if seo.nofollow}
		<meta name="robots" content="nofollow" />
	{/if}
	
	<!-- Canonical URL -->
	<link rel="canonical" href={seo.url} />
	
	<!-- JSON-LD 구조화된 데이터 -->
	{@html `<script type="application/ld+json">${JSON.stringify(websiteSchema)}</script>`}
</svelte:head>

{@render children()}
