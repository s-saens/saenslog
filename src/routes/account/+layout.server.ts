import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent, url }) => {
	const { session } = await parent();
	if (!session) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	return {};
};
