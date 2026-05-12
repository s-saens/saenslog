/** 레이아웃·페이지 load에서 넘기는 SEO 페이로드 */
export type SeoPayload = {
	/** `<title>` 앞부분 — 레이아웃에서 ` · {siteName}` 조합(홈 `/` 제외) */
	title?: string;
	description?: string;
	/** canonical pathname (`/blog`, `/blog/123` 등). 비우면 현재 경로 사용 */
	canonicalPath?: string;
	/** OG/Twitter 이미지 — `/...` 또는 절대 URL */
	ogImage?: string;
	type?: 'website' | 'article';
	publishedTime?: string;
	modifiedTime?: string;
	/** 예: `noindex, nofollow` */
	robots?: string;
};

export const SEO_SITE_NAME = 'SAENS';

export const SEO_DEFAULT_DESCRIPTION =
	'SAENS의 블로그·프로젝트 포트폴리오. 개발과 작업 기록을 공유합니다.';

export function plainTextFromMarkdown(md: string, maxLen: number): string {
	const t = md
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/[#*_~>/]|^\s*[-*+]\s+/gm, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (t.length <= maxLen) return t;
	return `${t.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

export function absoluteUrl(siteUrl: string, pathOrUrl: string): string {
	const base = siteUrl.replace(/\/$/, '');
	if (!pathOrUrl) return base;
	if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
	const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
	return `${base}${path}`;
}
