import { fail, redirect } from '@sveltejs/kit';
import {
	appendPostToFolder,
	BLOG_ROOT_FOLDER_ID,
	invalidateFoldersCache
} from '$lib/server/folders';
import { insertPost } from '$lib/server/posts';
import { invalidateEdgeCache, listingShellKey } from '$lib/server/edgeCache';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const raw = (url.searchParams.get('folder') ?? '').trim();
	const folderId = raw ? Number(raw) : NaN;
	return {
		folderId: Number.isFinite(folderId) && folderId >= BLOG_ROOT_FOLDER_ID ? folderId : null,
		seo: { title: '새 글 · 관리' }
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

		let id: number;
		try {
			({ id } = await insertPost(locals.supabase, { title, content_md, published }, user.id));
		} catch (e) {
			const msg = e instanceof Error ? e.message : '저장에 실패했습니다.';
			return fail(400, { message: msg });
		}

		if (Number.isFinite(folderId) && folderId >= BLOG_ROOT_FOLDER_ID) {
			await appendPostToFolder(locals.supabase, folderId, id);
			await invalidateFoldersCache();
			await invalidateEdgeCache(listingShellKey(folderId));
		}
		// 새 글이 루트 "All Posts" 리스팅에 나타나야 함 (공개 시)
		if (published) await invalidateEdgeCache(listingShellKey('root'));

		throw redirect(303, `/admin/posts/${id}/edit`);
	}
};
