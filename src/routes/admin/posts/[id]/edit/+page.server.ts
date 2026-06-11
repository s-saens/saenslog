import { error, fail, redirect } from '@sveltejs/kit';
import { deleteBlogAssetFolder } from '$lib/server/blogPostAssets';
import { deletePostById, getPostById, updatePostById } from '$lib/server/posts';
import { fetchAllFolders, removePostFromAllFolders } from '$lib/server/folders';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) error(404, 'Not found');

	const post = await getPostById(locals.supabase, id);
	if (!post) error(404, '글을 찾을 수 없습니다.');

	return {
		post,
		seo: { title: `${post.title} · 수정 · 관리` }
	};
};

export const actions: Actions = {
	autosave: async ({ request, locals, params }) => {
		const postId = Number(params.id);
		if (!Number.isFinite(postId) || postId <= 0)
			return fail(400, { message: '잘못된 글 id입니다.' });

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const content_md = String(form.get('content_md') ?? '');
		const published = form.get('published') === 'true';

		const post = await getPostById(locals.supabase, postId);
		if (!post) return fail(404, { message: '글을 찾을 수 없습니다.' });

		try {
			await updatePostById(locals.supabase, postId, {
				title: title || post.title,
				content_md: content_md || post.content_md,
				published
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : '저장에 실패했습니다.';
			return fail(400, { message: msg });
		}

		return { success: true };
	},
	save: async ({ request, locals, params }) => {
		const postId = Number(params.id);
		if (!Number.isFinite(postId) || postId <= 0)
			return fail(400, { message: '잘못된 글 id입니다.' });

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		if (!title) return fail(400, { message: '제목을 입력하세요.' });

		const content_md = String(form.get('content_md') ?? '');
		if (!content_md.trim()) return fail(400, { message: '본문을 입력하세요.' });

		const published = form.get('published') === 'true';

		try {
			await updatePostById(locals.supabase, postId, { title, content_md, published });
		} catch (e) {
			const msg = e instanceof Error ? e.message : '저장에 실패했습니다.';
			return fail(400, { message: msg });
		}
	},
	delete: async ({ locals, params }) => {
		const postId = Number(params.id);
		if (!Number.isFinite(postId) || postId <= 0)
			return fail(400, { message: '잘못된 글 id입니다.' });

		const folders = await fetchAllFolders(locals.supabase);
		await removePostFromAllFolders(locals.supabase, folders, postId);
		await deletePostById(locals.supabase, postId);

		try {
			await deleteBlogAssetFolder(String(postId));
		} catch {
			/* ignore */
		}

		throw redirect(303, '/admin/posts');
	}
};
