import { env as publicEnv } from '$env/dynamic/public';
import { SEO_DEFAULT_DESCRIPTION, SEO_SITE_NAME } from '$lib/seo';
import { getTracks } from '$lib/server/tracks';

export const load = async ({ locals, url }) => {
	// 매 내비게이션마다 실행 — 인증 서버 왕복(getUser) 대신 로컬 세션 디코드(safeGetSession)로
	// UI(로그인 상태 표시)만 결정한다. 보안 결정은 각 액션의 getUser가 담당.
	const [user, tracks] = await Promise.all([locals.safeGetSession(), getTracks()]);

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
