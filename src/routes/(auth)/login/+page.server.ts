import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const err = url.searchParams.get('error');
	return {
		next: url.searchParams.get('next') ?? '/',
		urlError: err
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const nextRaw = String(form.get('next') ?? url.searchParams.get('next') ?? '/');
		const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/';

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { email, message: error.message });

		throw redirect(303, next);
	}
};
