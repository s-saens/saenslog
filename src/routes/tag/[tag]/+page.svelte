<script lang="ts">
	import { generateSEOTags } from '$lib/seo';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	const { tag, posts } = data;
	
	const seo = generateSEOTags({
		title: `${tag} 태그의 글들 - Saenslog`,
		description: `${tag} 태그로 분류된 블로그 글 목록`,
		url: `https://saens.kr/tag/${tag}`
	});
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:url" content={seo.url} />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold text-gray-900 mb-2">
		<span class="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-lg font-medium mr-2">
			{tag}
		</span>
		태그의 글들
	</h1>
	
	<p class="text-gray-600 mb-8">총 {posts.length}개의 글</p>
	
	{#if posts.length === 0}
		<div class="text-center py-12">
			<p class="text-gray-500">아직 글이 없습니다.</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each posts as post}
				<article class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
					<a href="/blog/{post.tag}/{post.number}" class="block">
						<h2 class="text-2xl font-bold text-gray-900 mb-2 hover:text-indigo-600">
							{post.title}
						</h2>
						{#if post.description}
							<p class="text-gray-600 mb-3">{post.description}</p>
						{/if}
						<div class="flex items-center text-sm text-gray-500">
							<time>
								{new Date(post.date).toLocaleDateString('ko-KR', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</time>
						</div>
					</a>
				</article>
			{/each}
		</div>
	{/if}
</div>

