import type { FolderRow } from '$lib/blog/folderTree';
import type { PostListRow } from '$lib/blog/postList';

/**
 * /api/blog-index 응답 — 폴더 트리 + 글 목록 메타(본문 제외).
 * `isAdmin`: 방문자 캐시에는 false로 저장, admin은 라이브로 true(비공개 글 포함).
 */
export type BlogIndexPayload = { folders: FolderRow[]; posts: PostListRow[]; isAdmin: boolean };
