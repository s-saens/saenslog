import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent, url }) => {
	const { session, profile } = await parent();
	if (!session) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	if (profile?.role !== 'admin') {
		throw redirect(303, '/');
	}
	return {};
};
