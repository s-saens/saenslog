import type { SupabaseClient } from '@supabase/supabase-js';
import type { KVNamespace } from '@cloudflare/workers-types';
import { getRequestEvent } from '$app/server';
import { asNumberArray, BLOG_ROOT_FOLDER_ID, folderIdsReferencingPost } from '$lib/blog/folderTree';

// 브라우저 안전 순수 헬퍼는 `$lib/blog/folderTree`로 이동했고, 기존 서버 import 호환을 위해
// 여기서 re-export한다. 이 파일에는 Supabase/KV에 접근하는 서버 전용 함수만 남는다.
export {
	BLOG_ROOT_FOLDER_ID,
	asNumberArray,
	folderDisplayLabel,
	foldersById,
	rootFolderIds,
	findParentFolderId,
	ancestorFolderChain,
	folderPathLabelExcludingRoot,
	findFolderContainingPost,
	folderIdsReferencingPost,
	folderMovePickerEntries,
	toFolderInfo,
	type FolderRow
} from '$lib/blog/folderTree';

import type { FolderRow } from '$lib/blog/folderTree';

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
