import type { SupabaseClient } from '@supabase/supabase-js';
import type { FolderInfo } from '$lib/types/blogDisplay';

export type FolderRow = {
	id: number;
	name: string;
	posts: number[];
	subfolders: number[];
};

function asNumberArray(raw: unknown): number[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

export async function fetchAllFolders(supabase: SupabaseClient): Promise<FolderRow[]> {
	const { data, error } = await supabase.from('folders').select('id, name, posts, subfolders').order('id');

	if (error) {
		console.error('fetchAllFolders', error);
		return [];
	}

	return (data ?? []).map((row) => ({
		id: Number((row as { id: number }).id),
		name: String((row as { name: string }).name),
		posts: asNumberArray((row as { posts: unknown }).posts),
		subfolders: asNumberArray((row as { subfolders: unknown }).subfolders)
	}));
}

export function foldersById(folders: FolderRow[]): Map<number, FolderRow> {
	return new Map(folders.map((f) => [f.id, f]));
}

/** 다른 폴더의 subfolders에 등장하지 않는 최상위 폴더 id */
export function rootFolderIds(folders: FolderRow[]): number[] {
	const child = new Set<number>();
	for (const f of folders) {
		for (const sid of f.subfolders) child.add(sid);
	}
	return folders.map((f) => f.id).filter((id) => !child.has(id));
}

export function findParentFolderId(childId: number, folders: FolderRow[]): number | null {
	for (const f of folders) {
		if (f.subfolders.includes(childId)) return f.id;
	}
	return null;
}

/** child → … → root 순 (root가 마지막) */
export function ancestorFolderChain(folderId: number, folders: FolderRow[]): FolderRow[] {
	const byId = foldersById(folders);
	const chain: FolderRow[] = [];
	let cur: number | null = folderId;
	const guard = new Set<number>();
	while (cur != null && !guard.has(cur)) {
		guard.add(cur);
		const row = byId.get(cur);
		if (!row) break;
		chain.push(row);
		cur = findParentFolderId(cur, folders);
	}
	return chain.reverse();
}

export function findFolderContainingPost(postId: number, folders: FolderRow[]): FolderRow | null {
	for (const f of folders) {
		if (f.posts.includes(postId)) return f;
	}
	return null;
}

function countDescendantFolders(folderId: number, byId: Map<number, FolderRow>): number {
	const f = byId.get(folderId);
	if (!f) return 0;
	let n = 0;
	for (const sid of f.subfolders) {
		n += 1 + countDescendantFolders(sid, byId);
	}
	return n;
}

function collectDescendantPostIds(folderId: number, byId: Map<number, FolderRow>): number[] {
	const f = byId.get(folderId);
	if (!f) return [];
	const ids = [...f.posts];
	for (const sid of f.subfolders) {
		ids.push(...collectDescendantPostIds(sid, byId));
	}
	return ids;
}

export function folderIdsReferencingPost(folders: FolderRow[], postId: number): number[] {
	return folders.filter((f) => f.posts.includes(postId)).map((f) => f.id);
}

export async function appendPostToFolder(
	supabase: SupabaseClient,
	folderId: number,
	postId: number
): Promise<void> {
	const { data, error } = await supabase.from('folders').select('posts').eq('id', folderId).single();
	if (error) throw error;
	const posts = asNumberArray((data as { posts?: unknown })?.posts);
	if (posts.includes(postId)) return;
	const { error: upErr } = await supabase
		.from('folders')
		.update({ posts: [...posts, postId] })
		.eq('id', folderId);
	if (upErr) throw upErr;
}

export async function removePostFromFolder(
	supabase: SupabaseClient,
	folderId: number,
	postId: number
): Promise<void> {
	const { data, error } = await supabase.from('folders').select('posts').eq('id', folderId).single();
	if (error) throw error;
	const posts = asNumberArray((data as { posts?: unknown })?.posts).filter((id) => id !== postId);
	const { error: upErr } = await supabase.from('folders').update({ posts }).eq('id', folderId);
	if (upErr) throw upErr;
}

export async function removePostFromAllFolders(
	supabase: SupabaseClient,
	folders: FolderRow[],
	postId: number
): Promise<void> {
	for (const fid of folderIdsReferencingPost(folders, postId)) {
		await removePostFromFolder(supabase, fid, postId);
	}
}

type PostDateRow = { id: number; published_at: string | null; updated_at: string };

function latestIso(dates: string[]): string {
	if (dates.length === 0) return new Date(0).toISOString();
	return dates.reduce((a, b) => (new Date(a) >= new Date(b) ? a : b));
}

/** 폴더 카드용 — 하위 트리의 글 수·폴더 수·최신 글 시각(게시 기준) */
export function toFolderInfo(
	folder: FolderRow,
	allFolders: FolderRow[],
	postMetaById: Map<number, PostDateRow>
): FolderInfo {
	const byId = foldersById(allFolders);
	const directSub = folder.subfolders.length;
	const directPosts = folder.posts.length;
	const totalFolderCount = countDescendantFolders(folder.id, byId);
	const allPostIds = collectDescendantPostIds(folder.id, byId);
	const totalPostCount = allPostIds.length;
	const dates = allPostIds
		.map((id) => postMetaById.get(id))
		.filter(Boolean)
		.map((r) => r!.published_at ?? r!.updated_at);
	const date = latestIso(dates);

	return {
		name: folder.name,
		path: `f/${folder.id}`,
		folderCount: directSub,
		postCount: directPosts,
		totalFolderCount,
		totalPostCount,
		date
	};
}
