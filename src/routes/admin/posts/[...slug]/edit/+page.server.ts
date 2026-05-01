import { error, fail, redirect } from '@sveltejs/kit';
import { deletePostBySlug, getPostBySlug, parseTags, updatePost } from '$lib/server/posts';
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

		const categoryRaw = String(form.get('category') ?? '').trim();
		const category = categoryRaw || null;
		const tags = parseTags(String(form.get('tags') ?? ''));
		const content_md = String(form.get('content_md') ?? '');
		if (!content_md.trim()) return fail(400, { message: '본문을 입력하세요.' });

		const published = form.get('published') === 'true';

		try {
			await updatePost(locals.supabase, slug, {
				title,
				category,
				tags,
				content_md,
				published
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : '저장에 실패했습니다.';
			return fail(400, { message: msg });
		}

		throw redirect(303, `/blog/${slug}`);
	},
	delete: async ({ params, locals }) => {
		const slug = slugFromParams(params.slug);
		if (!slug) return fail(400, { message: '슬러그가 없습니다.' });

		await deletePostBySlug(locals.supabase, slug);
		throw redirect(303, '/admin/posts');
	}
};
