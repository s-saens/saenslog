<script lang="ts">
	import { generateSEOTags } from '$lib/seo';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	const post = data.post;
	
	const seo = generateSEOTags({
		title: post.title,
		description: post.description || post.title,
		url: `https://saens.kr/blog/${post.tag}/${post.number}`
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

<div class="max-w-4xl mx-auto px-4 py-8">
	<article class="prose prose-lg max-w-none">
		<header class="mb-8">
			<div class="mb-2">
				<a
					href="/tag/{post.tag}"
					class="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium hover:bg-indigo-200"
				>
					{post.tag}
				</a>
			</div>
			<h1 class="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
			{#if post.description}
				<p class="text-xl text-gray-600 mb-4">{post.description}</p>
			{/if}
			<time class="text-sm text-gray-500">
				{new Date(post.date).toLocaleDateString('ko-KR', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</time>
		</header>
		
		<div class="markdown-body">
			{@html post.htmlBody}
		</div>
	</article>
</div>

<style>
	:global(.markdown-body) {
		@apply prose prose-lg max-w-none;
	}
	
	:global(.markdown-body img) {
		@apply rounded-lg shadow-md my-4;
	}
</style>

