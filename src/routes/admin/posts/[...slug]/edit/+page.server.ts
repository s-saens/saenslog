import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import { deletePostBySlug, getPostBySlug, normalizeSlug, updatePost } from '$lib/server/posts';
import type { Actions, PageServerLoad } from './$types';

function slugFromParams(slug: string | string[] | undefined): string {
	if (slug === undefined) return '';
	if (Array.isArray(slug)) return slug.join('/');
	return slug;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const slug = slugFromParams(params.slug);
	if (!slug) error(404, 'Not found');

	const post = await getPostBySlug(locals.supabase, slug);
	if (!post) error(404, '글을 찾을 수 없습니다.');

	return { post };
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const slug = slugFromParams(params.slug);
		if (!slug) return fail(400, { message: '슬러그가 없습니다.' });

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		if (!title) return fail(400, { message: '제목을 입력하세요.' });

		const content_md = String(form.get('content_md') ?? '');
		if (!content_md.trim()) return fail(400, { message: '본문을 입력하세요.' });

		const published = form.get('published') === 'true';

		let slugField: string;
		try {
			slugField = normalizeSlug(String(form.get('slug') ?? ''));
		} catch (e) {
			return fail(400, { message: e instanceof Error ? e.message : '슬러그 오류' });
		}

		try {
			const { slug: savedSlug } = await updatePost(locals.supabase, slug, {
				slug: slugField,
				title,
				content_md,
				published
			});
			redirect(303, `/blog/${savedSlug}`);
		} catch (e) {
			if (isRedirect(e)) throw e;
			const msg = e instanceof Error ? e.message : '저장에 실패했습니다.';
			return fail(400, { message: msg });
		}
	},
	delete: async ({ params, locals }) => {
		const slug = slugFromParams(params.slug);
		if (!slug) return fail(400, { message: '슬러그가 없습니다.' });

		await deletePostBySlug(locals.supabase, slug);
		throw redirect(303, '/admin/posts');
	}
};
