import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, parent, url }) => {
	const { user } = await parent();
	if (!user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}

	const { data: profile, error } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (error) {
		throw redirect(303, '/');
	}

	if (profile?.role !== 'admin') {
		throw redirect(303, '/');
	}
	return {};
};
