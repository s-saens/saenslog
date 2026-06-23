/**
 * 브라우저 안전 글 목록 타입/정렬 — 유니버설 load·클라이언트에서 import 가능.
 * 서버 쿼리 함수는 `$lib/server/posts.ts`에 있고 이 타입/정렬을 re-export한다.
 */

export type PostListRow = {
	id: number;
	title: string;
	published: boolean;
	published_at: string | null;
	updated_at: string;
	word_count: number;
	view_count?: number;
};

/** 목록 정렬: 게시일 우선, 없으면 수정일 (내림차순) */
export function comparePostsByPostedDateDesc(
	a: Pick<PostListRow, 'published_at' | 'updated_at'>,
	b: Pick<PostListRow, 'published_at' | 'updated_at'>
): number {
	const ta = new Date(a.published_at ?? a.updated_at).getTime();
	const tb = new Date(b.published_at ?? b.updated_at).getTime();
	return tb - ta;
}
