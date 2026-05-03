import { fail, redirect } from '@sveltejs/kit';
import { insertPost, normalizeSlug } from '$lib/server/posts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const raw = (url.searchParams.get('parent') ?? '').trim().replace(/^\/+|\/+$/g, '');
	return { parentPrefix: raw };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { message: '로그인이 필요합니다.' });

		const form = await request.formData();
		const slugRaw = String(form.get('slug') ?? '');
		let slug: string;
		try {
			slug = normalizeSlug(slugRaw);
		} catch (e) {
			return fail(400, { message: e instanceof Error ? e.message : '슬러그 오류' });
		}

		const title = String(form.get('title') ?? '').trim();
		if (!title) return fail(400, { message: '제목을 입력하세요.' });

		const content_md = String(form.get('content_md') ?? '');
		if (!content_md.trim()) return fail(400, { message: '본문을 입력하세요.' });

		const published = form.get('published') === 'true';

		try {
			await insertPost(locals.supabase, { slug, title, content_md, published }, user.id);
		} catch (e) {
			const msg = e instanceof Error ? e.message : '저장에 실패했습니다.';
			return fail(400, { message: msg });
		}

		throw redirect(303, `/admin/posts/${slug}/edit`);
	}
};
