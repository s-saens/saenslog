import type { PageLoad } from './$types';
import { SEO_DEFAULT_DESCRIPTION } from '$lib/seo';

export const load: PageLoad = () => ({
	seo: {
		description: SEO_DEFAULT_DESCRIPTION,
		canonicalPath: '/'
	}
});
