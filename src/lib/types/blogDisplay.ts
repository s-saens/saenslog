/** Supabase `folders` 트리 → 목록 카드용 */
export type FolderInfo = {
	name: string;
	path: string;
	folderCount: number;
	postCount: number;
	totalFolderCount: number;
	totalPostCount: number;
	date: string;
};

/** 블로그 목록·카드 UI용 (서버 `FolderInfo` / 리스트 포스트와 동일 모양) */
export type BlogFolderListItem = {
	name: string;
	path: string;
	folderCount: number;
	postCount: number;
	totalFolderCount: number;
	totalPostCount: number;
	date: string;
};

export type BlogPostListItem = {
	title: string;
	path: string;
	/** 목록 보조줄: 비어 있으면 category(폴더명)로 대체 표시 */
	slug: string;
	category: string;
	date: string;
	wordCount: number;
	tistory?: string;
};
