import { getTracks } from '$lib/server/tracks';

export const load = async ({ locals }) => {
	const [user, tracks] = await Promise.all([locals.safeGetUser(), getTracks()]);

	return { user, tracks };
};
