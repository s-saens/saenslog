import { json } from '@sveltejs/kit';
import { fetchAllFolders, fetchAllFoldersCached } from '$lib/server/folders';
import { listPublishedPosts, listPostsAdmin } from '$lib/server/posts';
import { isBlogAdminUser } from '$lib/server/blogAdmin';
import { blogIndexKey, readEdgeCache, writeEdgeCache } from '$lib/server/edgeCache';
import type { BlogIndexPayload } from '$lib/types/blogIndex';
import type { RequestHandler } from './$types';

/**
 * 클라이언트가 첫 진입 시 1회 받아 메모리에 보유하는 블로그 인덱스(폴더 트리 + 글 목록 메타).
 * 방문자: 공개 글 + KV 폴더 캐시 + 엣지 캐시(s-maxage). admin: 비공개 포함, 공유 캐시 미사용.
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	const user = await locals.safeGetUser();
	const isAdmin = await isBlogAdminUser(locals.supabase, user);

	if (isAdmin) {
		// 비공개 글이 섞이므로 공유 캐시에 절대 넣지 않는다.
		const [folders, posts] = await Promise.all([
			fetchAllFolders(locals.supabase),
			listPostsAdmin(locals.supabase)
		]);
		return json({ folders, posts, isAdmin: true } satisfies BlogIndexPayload, {
			headers: { 'Cache-Control': 'private, no-store' }
		});
	}

	const cached = await readEdgeCache<BlogIndexPayload>(blogIndexKey());
	if (cached) {
		return json(cached, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
	}

	const [folders, posts] = await Promise.all([
		fetchAllFoldersCached(locals.supabase),
		listPublishedPosts(locals.supabase)
	]);
	const payload: BlogIndexPayload = { folders, posts, isAdmin: false };

	const waitUntil = platform?.context?.waitUntil?.bind(platform.context);
	await writeEdgeCache(blogIndexKey(), payload, { waitUntil });

	return json(payload, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
};
