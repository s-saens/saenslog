<script lang="ts">
	import { generateSEOTags } from '$lib/seo';
	
	// 홈페이지 SEO 설정 (각 페이지에서 개별적으로 설정 가능)
	const seo = generateSEOTags({
		title: 'Saenslog',
		description: 'Saenslog - 개인 블로그',
		url: 'https://saens.kr'
	});
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:url" content={seo.url} />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<link rel="canonical" href={seo.url} />
</svelte:head>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
