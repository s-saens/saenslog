import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return { next: url.searchParams.get('next') ?? '/' };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const passwordConfirm = String(form.get('passwordConfirm') ?? '');
		const nextRaw = String(form.get('next') ?? url.searchParams.get('next') ?? '/');
		const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/';

		if (password.length < 8) {
			return fail(400, { email, message: '비밀번호는 8자 이상이어야 합니다.' });
		}
		if (password !== passwordConfirm) {
			return fail(400, { email, message: '비밀번호 확인이 일치하지 않습니다.' });
		}

		const origin = url.origin;
		const { data: signData, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` }
		});

		if (error) return fail(400, { email, message: error.message });

		if (signData.session) {
			throw redirect(303, next);
		}

		return {
			email,
			needsConfirmation: true as const
		};
	}
};
