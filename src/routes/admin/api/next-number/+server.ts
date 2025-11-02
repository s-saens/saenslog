import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getNextNumberForTag } from '$lib/blog';

export const GET: RequestHandler = async ({ url }) => {
	const tag = url.searchParams.get('tag');
	
	if (!tag) {
		return json({ error: 'Tag parameter required' }, { status: 400 });
	}
	
	try {
		const number = await getNextNumberForTag(tag);
		return json({ number });
	} catch (error) {
		console.error('Error getting next number:', error);
		return json({ error: 'Failed to get next number' }, { status: 500 });
	}
};

