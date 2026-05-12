import { env as publicEnv } from '$env/dynamic/public';
import { SEO_DEFAULT_DESCRIPTION, SEO_SITE_NAME } from '$lib/seo';
import { getTracks } from '$lib/server/tracks';

export const load = async ({ locals, url }) => {
	const [user, tracks] = await Promise.all([locals.safeGetUser(), getTracks()]);

	const configured = (publicEnv.PUBLIC_SITE_URL ?? '').trim().replace(/\/$/, '');
	const siteUrl = configured || `${url.origin}`;

	return {
		user,
		tracks,
		seoDefaults: {
			siteUrl,
			siteName: SEO_SITE_NAME,
			defaultDescription: SEO_DEFAULT_DESCRIPTION,
			defaultOgImagePath: '/og-default.png',
			locale: 'ko_KR'
		}
	};
};
