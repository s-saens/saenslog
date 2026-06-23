import { BLOG_ROOT_FOLDER_ID } from '$lib/blog/folderTree';
import { buildFolderView } from '$lib/blog/buildFolderView';
import { ensureBlogIndex } from '$lib/stores/blogIndex.svelte';
import type { PageLoad, PageServerData } from './$types';

/** 서버 load의 글 상세(셸) 변형 — 리스팅 최소 반환({isPost:false})을 제외한 형태 */
type PostServerData = Extract<PageServerData, { isPost: true }>;

export const ssr = true;

/**
 * 리스팅(/blog, /blog/f/{id})은 메모리 인덱스(/api/blog-index)에서 뷰를 계산한다.
 * 첫 진입 시 1회 fetch(SSR 시 직렬화 → hydration 재요청 없음), 이후 이동은 메모리에서 즉시.
 * 글 상세는 서버 load(정적 셸)를 그대로 통과시킨다.
 */
export const load: PageLoad = async ({ params, data, fetch }) => {
	const pathParam = params.path ?? '';
	const segments = pathParam.split('/').filter(Boolean);

	const isRoot = segments.length === 0;
	const isFolder = segments[0] === 'f' && segments.length === 2 && /^\d+$/.test(segments[1]);

	if (isRoot || isFolder) {
		const index = await ensureBlogIndex(fetch);
		const folderId = isRoot ? BLOG_ROOT_FOLDER_ID : Number(segments[1]);
		return buildFolderView(index, folderId, { pathParam, segments });
	}

	// 글 상세 등 — 서버 +page.server.ts가 만든 셸 데이터를 그대로 사용.
	// 이 분기는 글 경로에서만 도달하므로 셸(글) 형태로 좁힌다(리스팅 최소 반환 배제).
	return data as PostServerData;
};
