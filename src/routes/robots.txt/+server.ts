import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const configured = (publicEnv.PUBLIC_SITE_URL ?? '').trim().replace(/\/$/, '');
	const base = configured || url.origin;

	const body = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /admin/',
		'Disallow: /account',
		'Disallow: /login',
		'Disallow: /signup',
		'Disallow: /logout',
		'',
		`Sitemap: ${base}/sitemap.xml`,
		''
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
