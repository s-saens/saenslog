import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBlogPostsByTag } from '$lib/blog';

export const load: PageServerLoad = async ({ params }) => {
	const tag = params.tag;
	
	if (!tag) {
		throw error(404, 'Not found');
	}
	
	const posts = await getBlogPostsByTag(tag);
	
	return {
		tag,
		posts
	};
};

