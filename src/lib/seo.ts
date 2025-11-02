export interface SEOConfig {
	title?: string;
	description?: string;
	image?: string;
	url?: string;
	type?: string;
	siteName?: string;
	twitterCard?: 'summary' | 'summary_large_image';
	noindex?: boolean;
	nofollow?: boolean;
}

const defaultConfig: Required<Omit<SEOConfig, 'url' | 'noindex' | 'nofollow'>> & {
	noindex: boolean;
	nofollow: boolean;
} = {
	title: 'Saens\' Blog',
	description: 'Saens\' Blog',
	image: 'https://saens.kr/og-image.png',
	type: 'website',
	siteName: 'Saens\' Blog',
	twitterCard: 'summary_large_image',
	noindex: false,
	nofollow: false
};

const siteUrl = 'https://saens.kr';

export function getSEOConfig(config: SEOConfig = {}): SEOConfig {
	return {
		...defaultConfig,
		...config,
		url: config.url || siteUrl
	};
}

export function generateSEOTags(config: SEOConfig = {}) {
	const seo = getSEOConfig(config);
	const fullTitle = seo.title === defaultConfig.title 
		? seo.title 
		: `${seo.title} | ${defaultConfig.siteName}`;
	const fullUrl = seo.url || siteUrl;
	const fullImage = seo.image?.startsWith('http') 
		? seo.image 
		: `${siteUrl}${seo.image?.startsWith('/') ? seo.image : `/${seo.image}`}`;

	return {
		title: fullTitle,
		description: seo.description || defaultConfig.description,
		image: fullImage,
		url: fullUrl,
		type: seo.type || defaultConfig.type,
		siteName: seo.siteName || defaultConfig.siteName,
		twitterCard: seo.twitterCard || defaultConfig.twitterCard,
		noindex: seo.noindex || defaultConfig.noindex,
		nofollow: seo.nofollow || defaultConfig.nofollow
	};
}

