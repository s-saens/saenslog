import type { RequestHandler } from '@sveltejs/kit';
import { getAllTags, getBlogPostsByTag } from '$lib/blog';

const siteUrl = 'https://saens.kr';

// prerender 옵션 추가 - 빌드 타임에 정적 사이트맵 생성
export const prerender = true;

export const GET: RequestHandler = async () => {
	const routes: Array<{ loc: string; priority: string; changefreq: string }> = [
		{ loc: '', priority: '1.0', changefreq: 'daily' }
	];

	// 모든 태그 페이지 추가
	const tags = await getAllTags();
	for (const tag of tags) {
		routes.push({
			loc: `/tag/${tag}`,
			priority: '0.8',
			changefreq: 'weekly'
		});
	}

	// 모든 블로그 포스트 추가
	for (const tag of tags) {
		const posts = await getBlogPostsByTag(tag);
		for (const post of posts) {
			routes.push({
				loc: `/blog/${tag}/${post.number}`,
				priority: '0.7',
				changefreq: 'monthly'
			});
		}
	}

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${routes
	.map(
		(route) => `  <url>
    <loc>${siteUrl}${route.loc}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
