import type { SupabaseClient } from '@supabase/supabase-js';
import type { KVNamespace } from '@cloudflare/workers-types';
import { getRequestEvent } from '$app/server';
import type { FolderInfo } from '$lib/types/blogDisplay';

/** Supabase 블로그 트리 루트(`posts`/`subfolders`가 `/blog`와 대응) */
export const BLOG_ROOT_FOLDER_ID = 0;

export type FolderRow = {
	id: number;
	name: string | null;
	posts: number[];
	subfolders: number[];
};

/**
 * 카드·브레드크럼·이동 UI용 라벨.
 * 루트(`id === 0`)는 DB에서 `name`이 `root` 등 플레이스홀더여도 사용자에게는 항상 "Blog"로 표시한다.
 */
export function folderDisplayLabel(folder: FolderRow): string {
	if (folder.id === BLOG_ROOT_FOLDER_ID) return 'Blog';
	const n = folder.name?.trim();
	return n ? n : '이름 없음';
}

function asNumberArray(raw: unknown): number[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

export async function fetchAllFolders(supabase: SupabaseClient): Promise<FolderRow[]> {
	const { data, error } = await supabase
		.from('folders')
		.select('id, name, posts, subfolders')
		.order('id');

	if (error) {
		console.error('fetchAllFolders', error);
		return [];
	}

	return (data ?? []).map((row) => {
		const rawName = (row as { name: unknown }).name;
		return {
			id: Number((row as { id: number }).id),
			name: rawName == null ? null : String(rawName),
			posts: asNumberArray((row as { posts: unknown }).posts),
			subfolders: asNumberArray((row as { subfolders: unknown }).subfolders)
		};
	});
}

/** 폴더 트리 KV 캐시 키/TTL. 트리는 admin 폴더 작업 때만 바뀌므로 캐시 적중률이 높다. */
const FOLDERS_CACHE_KEY = 'folders:tree:v1';
const FOLDERS_CACHE_TTL_SECONDS = 300;

function foldersKv(): KVNamespace | null {
	try {
		return getRequestEvent().platform?.env?.FOLDERS ?? null;
	} catch {
		return null;
	}
}

/**
 * 방문자: KV 캐시에서 폴더 트리를 읽고(미스 시 DB→KV 채움), admin: 항상 DB 직접 조회.
 * KV 바인딩이 없으면(dev 등) 그대로 DB 조회로 폴백한다. `bypass`(보통 isAdmin)가
 * true면 캐시를 건너뛰어 작성자는 폴더 변경을 즉시 본다(KV 전파 지연 회피).
 */
export async function fetchAllFoldersCached(
	supabase: SupabaseClient,
	bypass?: boolean | Promise<boolean>
): Promise<FolderRow[]> {
	const isAdmin = await bypass;
	const kv = foldersKv();
	if (isAdmin || !kv) return fetchAllFolders(supabase);

	const cached = (await kv.get(FOLDERS_CACHE_KEY, 'json')) as FolderRow[] | null;
	if (cached) return cached;

	const rows = await fetchAllFolders(supabase);
	// 빈 결과는 캐시하지 않음(조회 오류로 []가 반환될 수 있어 stale 빈 트리를 막음)
	if (rows.length > 0) {
		await kv.put(FOLDERS_CACHE_KEY, JSON.stringify(rows), {
			expirationTtl: FOLDERS_CACHE_TTL_SECONDS
		});
	}
	return rows;
}

/** 폴더 변경(생성·이동·삭제) 후 호출 — 다음 읽기에서 KV를 새로 채우도록 한다. */
export async function invalidateFoldersCache(): Promise<void> {
	const kv = foldersKv();
	if (kv) await kv.delete(FOLDERS_CACHE_KEY);
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

/** 루트(id=0) 제외, 루트→…→해당 폴더 순서의 라벨을 잇는 경로(예: `Deb/AI`). */
export function folderPathLabelExcludingRoot(
	folderId: number,
	folders: FolderRow[],
	separator = '/'
): string {
	const chain = ancestorFolderChain(folderId, folders).filter((f) => f.id !== BLOG_ROOT_FOLDER_ID);
	if (chain.length === 0) return '';
	return chain.map(folderDisplayLabel).join(separator);
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

/** 새 폴더 행 삽입 후, 부모가 있으면 `subfolders`에 연결 */
export async function createFolderUnderParent(
	supabase: SupabaseClient,
	parentFolderId: number | null,
	name: string
): Promise<{ id: number }> {
	const trimmed = name.trim();
	if (!trimmed) throw new Error('폴더 이름을 입력하세요.');
	if (trimmed.length > 160) throw new Error('폴더 이름이 너무 깁니다.');

	const { data: inserted, error: insErr } = await supabase
		.from('folders')
		.insert({ name: trimmed, posts: [], subfolders: [] })
		.select('id')
		.single();

	if (insErr) throw insErr;
	const newId = Number((inserted as { id: number }).id);

	if (
		parentFolderId != null &&
		Number.isFinite(parentFolderId) &&
		parentFolderId >= BLOG_ROOT_FOLDER_ID
	) {
		const { data: parentRow, error: pErr } = await supabase
			.from('folders')
			.select('subfolders')
			.eq('id', parentFolderId)
			.single();
		if (pErr) throw pErr;
		const subfolders = asNumberArray((parentRow as { subfolders?: unknown })?.subfolders);
		if (!subfolders.includes(newId)) {
			const { error: upErr } = await supabase
				.from('folders')
				.update({ subfolders: [...subfolders, newId] })
				.eq('id', parentFolderId);
			if (upErr) throw upErr;
		}
	}

	return { id: newId };
}

export async function appendPostToFolder(
	supabase: SupabaseClient,
	folderId: number,
	postId: number
): Promise<void> {
	const { data, error } = await supabase
		.from('folders')
		.select('posts')
		.eq('id', folderId)
		.single();
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
	const { data, error } = await supabase
		.from('folders')
		.select('posts')
		.eq('id', folderId)
		.single();
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

/** 글을 다른 폴더로 옮김. `targetFolderId === null`이면 모든 폴더에서만 제거(어느 폴더에도 속하지 않음). */
export async function movePostToFolder(
	supabase: SupabaseClient,
	postId: number,
	targetFolderId: number | null
): Promise<void> {
	const folders = await fetchAllFolders(supabase);
	await removePostFromAllFolders(supabase, folders, postId);
	if (
		targetFolderId != null &&
		Number.isFinite(targetFolderId) &&
		targetFolderId >= BLOG_ROOT_FOLDER_ID
	) {
		await appendPostToFolder(supabase, targetFolderId, postId);
	}
}

/** 관리자 글 이동 UI — 폴더 트리 경로 레이블(루트 id는 빈 선택으로 처리하므로 제외) */
export function folderMovePickerEntries(
	allFolders: FolderRow[]
): { id: number; pathLabel: string }[] {
	const rows = allFolders
		.filter((f) => f.id !== BLOG_ROOT_FOLDER_ID)
		.map((f) => ({
			id: f.id,
			pathLabel: ancestorFolderChain(f.id, allFolders).map(folderDisplayLabel).join(' › ')
		}));
	rows.sort((a, b) => a.pathLabel.localeCompare(b.pathLabel, 'ko'));
	return rows;
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
		name: folderDisplayLabel(folder),
		path: `f/${folder.id}`,
		folderCount: directSub,
		postCount: directPosts,
		totalFolderCount,
		totalPostCount,
		date
	};
}
