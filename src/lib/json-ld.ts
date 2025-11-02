export interface WebsiteSchema {
	'@context': string;
	'@type': 'WebSite';
	name: string;
	url: string;
	description?: string;
}

export interface PersonSchema {
	'@context': string;
	'@type': 'Person';
	name: string;
	url?: string;
	sameAs?: string[];
}

export interface ArticleSchema {
	'@context': string;
	'@type': 'Article';
	headline: string;
	description: string;
	url: string;
	datePublished?: string;
	dateModified?: string;
	author?: {
		'@type': 'Person';
		name: string;
	};
	image?: string;
}

export function generateWebsiteSchema(
	name: string,
	url: string,
	description?: string
): WebsiteSchema {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name,
		url,
		...(description && { description })
	};
}

export function generatePersonSchema(
	name: string,
	url?: string,
	sameAs?: string[]
): PersonSchema {
	return {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name,
		...(url && { url }),
		...(sameAs && { sameAs })
	};
}

export function generateArticleSchema(
	headline: string,
	description: string,
	url: string,
	options?: {
		datePublished?: string;
		dateModified?: string;
		author?: string;
		image?: string;
	}
): ArticleSchema {
	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline,
		description,
		url,
		...(options?.datePublished && { datePublished: options.datePublished }),
		...(options?.dateModified && { dateModified: options.dateModified }),
		...(options?.author && {
			author: {
				'@type': 'Person',
				name: options.author
			}
		}),
		...(options?.image && { image: options.image })
	};
}

