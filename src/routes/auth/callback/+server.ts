import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/';
	const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (error) {
			throw redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
		}
	}

	throw redirect(303, safeNext);
};
