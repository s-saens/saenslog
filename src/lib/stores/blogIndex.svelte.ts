import type { FolderRow } from '$lib/blog/folderTree';
import type { PostListRow } from '$lib/blog/postList';
import type { BlogIndexPayload } from '$lib/types/blogIndex';

/**
 * 첫 진입 시 1회 받아 메모리에 보유하는 블로그 인덱스(폴더 트리 + 글 목록 메타).
 * 이후 블로그 이동은 이 메모리에서 폴더 뷰를 계산하므로 목록/트리 데이터를 다시 받지 않는다.
 * 모듈 싱글턴 `$state`라 클라이언트 내비게이션 전반에 걸쳐 유지된다.
 */
export const blogIndex = $state<{ data: BlogIndexPayload | null }>({ data: null });

let inflight: Promise<BlogIndexPayload> | null = null;

/**
 * 인덱스를 보장한다. 이미 메모리에 있으면 즉시 반환(네트워크 0). 진행 중인 요청이 있으면
 * 합쳐서(single-flight) 중복 fetch를 막는다. `force`는 admin 변경/명시 무효화 때만.
 *
 * 유니버설 load의 `fetch`로 호출하면 SSR 시 응답이 직렬화돼 hydration에서 재요청이 없다.
 */
export async function ensureBlogIndex(
	fetchFn: typeof fetch,
	opts?: { force?: boolean }
): Promise<BlogIndexPayload> {
	if (!opts?.force && blogIndex.data) return blogIndex.data;
	if (!opts?.force && inflight) return inflight;

	inflight = (async () => {
		const res = await fetchFn('/api/blog-index');
		if (!res.ok) throw new Error(`blog-index ${res.status}`);
		const json = (await res.json()) as BlogIndexPayload;
		blogIndex.data = json;
		return json;
	})();

	try {
		return await inflight;
	} finally {
		inflight = null;
	}
}

export type { FolderRow, PostListRow };
