import { json, error } from '@sveltejs/kit';
import { loadPostLikeSummary, resolveRateContext } from '$lib/server/postEngagement';
import type { RequestHandler } from './$types';

/** 글 좋아요 수 + 뷰어 좋아요 여부. 마운트 후 클라이언트가 fetch하는 island. */
export const GET: RequestHandler = async ({ params, locals, getClientAddress }) => {
	const postId = Number(params.id);
	if (!Number.isFinite(postId) || postId <= 0) error(400, '잘못된 글 id');

	const user = await locals.safeGetSession();
	const { viewerIpHash, service } = resolveRateContext(getClientAddress);

	const summary = await loadPostLikeSummary(
		locals.supabase,
		service,
		postId,
		user?.id ?? null,
		viewerIpHash
	);

	return json(summary, { headers: { 'Cache-Control': 'private, no-store' } });
};
