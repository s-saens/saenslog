import { env as privateEnv } from '$env/dynamic/private';
import { hashCommentClientIp } from '$lib/server/commentGuestRateLimit';
import { tryCreateSupabaseServiceClient } from '$lib/server/supabaseService';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 글 댓글·좋아요 읽기 로직 — 글 상세 load(이제 트림됨), 댓글/좋아요 island 엔드포인트,
 * 뮤테이션 액션이 공유한다. IP 해시·서비스 클라이언트 산출을 단일 소스로 모아
 * 게스트 좋아요 상태가 어디서든 동일하게 계산되도록 한다.
 */

export type CommentRow = {
	id: number;
	content: string;
	author_id: string | null;
	guest_name: string | null;
	parent_id: number | null;
	created_at: string;
	profiles: { username: string; avatar_url: string | null } | null;
};

export type CommentLikeMap = Record<string, { count: number; liked: boolean }>;

/** 댓글 테이블의 post_slug에는 글 id를 문자열로 저장한다. */
export function commentPostRef(postId: number): string {
	return String(postId);
}

/** 레이트리밋/게스트 식별 컨텍스트 — rateSecret 우선순위와 ipHash 산출을 한 곳에서 결정. */
export function resolveRateContext(getClientAddress: () => string) {
	const rateSecret = privateEnv.COMMENT_RATE_LIMIT_SECRET ?? privateEnv.SUPABASE_SECRET_KEY ?? '';
	const viewerIpHash = rateSecret
		? hashCommentClientIp(rateSecret, getClientAddress() ?? 'unknown')
		: null;
	const service = tryCreateSupabaseServiceClient();
	return { rateSecret, viewerIpHash, service };
}

export async function loadPostLikeSummary(
	supabase: SupabaseClient,
	service: ReturnType<typeof tryCreateSupabaseServiceClient>,
	postId: number,
	userId: string | null,
	ipHash: string | null
): Promise<{ count: number; liked: boolean }> {
	const countPromise = supabase
		.from('post_likes')
		.select('*', { count: 'exact', head: true })
		.eq('post_id', postId);

	const likedPromise = userId
		? supabase
				.from('post_likes')
				.select('id')
				.eq('post_id', postId)
				.eq('user_id', userId)
				.maybeSingle()
				.then(({ data }) => !!data)
		: ipHash && service
			? service
					.from('post_likes')
					.select('id')
					.eq('post_id', postId)
					.eq('ip_hash', ipHash)
					.is('user_id', null)
					.maybeSingle()
					.then(({ data }) => !!data)
			: Promise.resolve(false);

	const [{ count, error: cErr }, liked] = await Promise.all([countPromise, likedPromise]);
	if (cErr) console.error('post_likes count', cErr);

	return { count: count ?? 0, liked };
}

export function buildCommentLikeMap(
	commentIds: number[],
	rows: { comment_id: number; user_id: string | null; ip_hash: string | null }[],
	userId: string | null,
	ipHash: string | null
): CommentLikeMap {
	const out: CommentLikeMap = {};
	for (const id of commentIds) out[String(id)] = { count: 0, liked: false };
	for (const row of rows) {
		const key = String(row.comment_id);
		const cur = out[key];
		if (!cur) continue;
		cur.count++;
		if (userId && row.user_id === userId) cur.liked = true;
		else if (!userId && ipHash && row.user_id === null && row.ip_hash === ipHash) cur.liked = true;
	}
	return out;
}

export async function loadCommentsForPost(
	supabase: SupabaseClient,
	postId: number
): Promise<CommentRow[]> {
	const ref = commentPostRef(postId);
	const { data, error: qErr } = await supabase
		.from('comments')
		.select(
			'id, content, author_id, guest_name, parent_id, created_at, profiles(username, avatar_url)'
		)
		.eq('post_slug', ref)
		.order('created_at', { ascending: true });

	if (qErr) {
		console.error('comments load', qErr);
		return [];
	}
	const rows = data ?? [];
	return rows.map((row) => {
		const p = row.profiles;
		const profiles =
			p == null
				? null
				: Array.isArray(p)
					? ((p[0] as { username: string; avatar_url: string | null } | undefined) ?? null)
					: (p as { username: string; avatar_url: string | null });
		return {
			id: row.id,
			content: row.content,
			author_id: row.author_id as string | null,
			guest_name: (row as { guest_name?: string | null }).guest_name ?? null,
			parent_id: row.parent_id,
			created_at: row.created_at,
			profiles
		};
	});
}

/** 댓글 + 댓글별 좋아요 맵을 한 번에 — island /api/posts/[id]/comments 와 동일 경로 */
export async function loadCommentsWithLikes(
	supabase: SupabaseClient,
	postId: number,
	userId: string | null,
	ipHash: string | null
): Promise<{ comments: CommentRow[]; commentLikesById: CommentLikeMap }> {
	const comments = await loadCommentsForPost(supabase, postId);
	const commentIds = comments.map((c) => c.id);
	if (commentIds.length === 0) return { comments, commentLikesById: {} };

	const { data: likeRows, error: lrErr } = await supabase
		.from('comment_likes')
		.select('comment_id, user_id, ip_hash')
		.in('comment_id', commentIds);
	if (lrErr) console.error('comment_likes load', lrErr);

	return {
		comments,
		commentLikesById: buildCommentLikeMap(commentIds, likeRows ?? [], userId, ipHash)
	};
}
