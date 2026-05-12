import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	if (!user) return {};

	const { data, error } = await locals.supabase
		.from('profiles')
		.select('username, display_name, avatar_url, role')
		.eq('id', user.id)
		.single();

	if (error || !data || (data.role !== 'admin' && data.role !== 'member')) {
		return { profile: null };
	}

	return { profile: data as App.Profile };
};
