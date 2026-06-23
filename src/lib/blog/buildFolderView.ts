import { error } from '@sveltejs/kit';
import {
	ancestorFolderChain,
	BLOG_ROOT_FOLDER_ID,
	folderDisplayLabel,
	folderPathLabelExcludingRoot,
	findFolderContainingPost,
	foldersById,
	toFolderInfo,
	type FolderRow
} from '$lib/blog/folderTree';
import { comparePostsByPostedDateDesc, type PostListRow } from '$lib/blog/postList';
import type { BlogIndexPayload } from '$lib/types/blogIndex';

export type ListPost = {
	title: string;
	path: string;
	category: string;
	date: string;
	wordCount: number;
	viewCount: number;
	tistory?: string;
};

function postRowToCard(row: PostListRow, folderLabel: string): ListPost {
	return {
		title: row.title,
		path: String(row.id),
		category: folderLabel,
		date: row.published_at ?? row.updated_at,
		wordCount: row.word_count,
		viewCount: Number(row.view_count ?? 0)
	};
}

function breadcrumbItems(chainExcludingRoot: FolderRow[]): { label: string; path: string }[] {
	return chainExcludingRoot.map((f) => ({ label: folderDisplayLabel(f), path: `/blog/f/${f.id}` }));
}

/**
 * 메모리 인덱스(폴더 트리 + 글 목록)에서 폴더별 리스팅 뷰를 계산한다 — 순수/브라우저 안전.
 * 서버 `loadBlogFolderListing`과 동일한 데이터 형태를 만든다(동적 글 필드는 리스팅에선 빈 값).
 * 방문자 인덱스는 공개 글만, admin 인덱스는 비공개 포함이므로 `index.isAdmin`으로 노출을 가른다.
 */
export function buildFolderView(
	index: BlogIndexPayload,
	folderId: number,
	ctx: { pathParam: string; segments: string[] }
) {
	const { folders: allFolders, posts: allIndexPosts, isAdmin } = index;
	const byId = foldersById(allFolders);
	const folder = byId.get(folderId);
	if (!folder) error(404, '폴더를 찾을 수 없습니다.');

	const chainNoRoot = ancestorFolderChain(folderId, allFolders).filter(
		(f) => f.id !== BLOG_ROOT_FOLDER_ID
	);
	const breadcrumb =
		folderId === BLOG_ROOT_FOLDER_ID
			? [{ label: 'Blog', path: '/blog' }]
			: [{ label: 'Blog', path: '/blog' }, ...breadcrumbItems(chainNoRoot)];

	const postMetaById = new Map(allIndexPosts.map((r) => [r.id, r]));

	const subFolderRows = folder.subfolders
		.map((id) => byId.get(id))
		.filter((f): f is FolderRow => Boolean(f));
	subFolderRows.sort((a, b) =>
		(a.name ?? '').localeCompare(b.name ?? '', 'ko', { sensitivity: 'base' })
	);
	const folders = subFolderRows.map((f) => toFolderInfo(f, allFolders, postMetaById));

	const folderTitle = folderId === BLOG_ROOT_FOLDER_ID ? 'Blog' : folderDisplayLabel(folder);
	const listPathLabel = folderPathLabelExcludingRoot(folderId, allFolders);

	// 폴더 직속 글 — 방문자 인덱스는 이미 공개만, admin은 비공개 포함(여기선 추가 필터 없음)
	const directRows = folder.posts
		.map((id) => postMetaById.get(id))
		.filter((r): r is PostListRow => Boolean(r))
		.sort(comparePostsByPostedDateDesc);
	const posts: ListPost[] = directRows.map((r) => postRowToCard(r, listPathLabel));

	// "All Posts" 섹션은 루트에서만, 항상 공개 글 기준(서버 동작과 일치)
	const allPosts: ListPost[] =
		folderId === BLOG_ROOT_FOLDER_ID
			? [...allIndexPosts]
					.filter((r) => r.published)
					.sort(comparePostsByPostedDateDesc)
					.map((r) => {
						const host = findFolderContainingPost(r.id, allFolders);
						const pathLabel = host ? folderPathLabelExcludingRoot(host.id, allFolders) : '';
						return postRowToCard(r, pathLabel);
					})
			: [];

	return {
		path: folderId === BLOG_ROOT_FOLDER_ID ? '' : ctx.pathParam,
		pathParam: ctx.pathParam,
		segments: ctx.segments,
		breadcrumb,
		isPost: false as const,
		isAdmin,
		currentFolderId: folderId,
		folders,
		posts,
		allPosts,
		postId: null as number | null,
		postFolderId: null as number | null,
		folderMoveTargets: [] as { id: number; pathLabel: string }[],
		seo: {
			title: folderTitle,
			description:
				folderId === BLOG_ROOT_FOLDER_ID
					? '블로그 글과 폴더 목록입니다.'
					: `"${folderTitle}" 폴더의 글 목록입니다.`,
			canonicalPath: folderId === BLOG_ROOT_FOLDER_ID ? '/blog' : `/blog/f/${folderId}`
		}
	};
}
