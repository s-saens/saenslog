import { json, error } from '@sveltejs/kit';
import { loadCommentsWithLikes, resolveRateContext } from '$lib/server/postEngagement';
import type { RequestHandler } from './$types';

/** 글 댓글 + 댓글별 좋아요 상태(뷰어별). 마운트 후 클라이언트가 fetch하는 island. */
export const GET: RequestHandler = async ({ params, locals, getClientAddress }) => {
	const postId = Number(params.id);
	if (!Number.isFinite(postId) || postId <= 0) error(400, '잘못된 글 id');

	const user = await locals.safeGetSession();
	const { viewerIpHash } = resolveRateContext(getClientAddress);

	const { comments, commentLikesById } = await loadCommentsWithLikes(
		locals.supabase,
		postId,
		user?.id ?? null,
		viewerIpHash
	);

	// 뷰어별(좋아요 상태)이라 절대 공유 캐시에 넣지 않는다.
	return json({ comments, commentLikesById }, { headers: { 'Cache-Control': 'private, no-store' } });
};
