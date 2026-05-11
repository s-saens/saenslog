import { fail, redirect } from '@sveltejs/kit';
import { appendPostToFolder } from '$lib/server/folders';
import { insertPost } from '$lib/server/posts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const raw = (url.searchParams.get('folder') ?? '').trim();
	const folderId = raw ? Number(raw) : NaN;
	return {
		folderId: Number.isFinite(folderId) && folderId > 0 ? folderId : null
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { message: '로그인이 필요합니다.' });

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		if (!title) return fail(400, { message: '제목을 입력하세요.' });

		const content_md = String(form.get('content_md') ?? '');
		if (!content_md.trim()) return fail(400, { message: '본문을 입력하세요.' });

		const published = form.get('published') === 'true';
		const folderRaw = String(form.get('folder_id') ?? '').trim();
		const folderId = folderRaw ? Number(folderRaw) : NaN;

		const { id } = await insertPost(locals.supabase, { title, content_md, published }, user.id);

		if (Number.isFinite(folderId) && folderId > 0) {
			await appendPostToFolder(locals.supabase, folderId, id);
		}

		throw redirect(303, `/admin/posts/${id}/edit`);
	}
};
