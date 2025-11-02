import type { RequestHandler } from '@sveltejs/kit';

const siteUrl = 'https://saens.kr';

// 여기에 사이트의 모든 경로를 추가하세요
const routes = [
	'', // 홈 페이지
	// '/about',
	// '/posts',
	// 다른 페이지 경로들을 여기에 추가
];

export const GET: RequestHandler = async () => {
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${routes
	.map(
		(route) => `  <url>
    <loc>${siteUrl}${route}</loc>
    <changefreq>daily</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
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

