import { listPostsAdmin } from '$lib/server/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const posts = await listPostsAdmin(locals.supabase);
	return { posts };
};
