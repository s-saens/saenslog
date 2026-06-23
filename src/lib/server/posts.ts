import { renderMarkdownToHtml } from '$lib/markdownCompile';
import type { SupabaseClient } from '@supabase/supabase-js';
import { type PostListRow, comparePostsByPostedDateDesc } from '$lib/blog/postList';

// 브라우저 안전 타입/정렬은 `$lib/blog/postList`로 이동, 기존 import 호환 위해 re-export.
export { type PostListRow, comparePostsByPostedDateDesc };

export type PostFullRow = PostListRow & {
	content_md: string;
	content_html: string;
	author_id: string;
};

function countWords(md: string): number {
	const t = md.trim();
	if (!t) return 0;
	return t.split(/\s+/).filter(Boolean).length;
}

/** 미디어 업로드·정적 경로용 — 숫자 id 한 덩어리 */
export function normalizeBlogAssetKey(raw: string): string {
	const s = raw.trim();
	if (!/^\d+$/.test(s)) throw new Error('유효한 글 id(숫자)가 필요합니다.');
	return s;
}

export async function listPostsAdmin(supabase: SupabaseClient): Promise<PostListRow[]> {
	const { data, error } = await supabase
		.from('posts')
		.select('id, title, published, published_at, updated_at, word_count, view_count');

	if (error) throw error;
	const rows = (data ?? []) as PostListRow[];
	rows.sort(comparePostsByPostedDateDesc);
	return rows;
}

export async function getPostById(
	supabase: SupabaseClient,
	id: number
): Promise<PostFullRow | null> {
	const { data, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();

	if (error) throw error;
	return data as PostFullRow | null;
}

export async function insertPost(
	supabase: SupabaseClient,
	input: {
		title: string;
		content_md: string;
		published: boolean;
	},
	authorId: string
): Promise<{ id: number }> {
	const content_html = renderMarkdownToHtml(input.content_md);
	const word_count = countWords(input.content_md);
	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from('posts')
		.insert({
			title: input.title.trim(),
			content_md: input.content_md,
			content_html,
			word_count,
			author_id: authorId,
			published: input.published,
			published_at: input.published ? now : null,
			updated_at: now
		})
		.select('id')
		.single();

	if (error) throw error;
	return { id: data.id as number };
}

export async function updatePostById(
	supabase: SupabaseClient,
	postId: number,
	input: {
		title: string;
		content_md: string;
		published: boolean;
	}
): Promise<void> {
	const now = new Date().toISOString();

	const { data: current, error: fetchErr } = await supabase
		.from('posts')
		.select('published, published_at')
		.eq('id', postId)
		.single();

	if (fetchErr) throw fetchErr;

	let published_at: string | null = current.published_at as string | null;
	if (input.published) {
		if (!current.published) {
			published_at = now;
		}
	} else {
		published_at = null;
	}

	const content_html = renderMarkdownToHtml(input.content_md);
	const word_count = countWords(input.content_md);

	const { error } = await supabase
		.from('posts')
		.update({
			title: input.title.trim(),
			content_md: input.content_md,
			content_html,
			word_count,
			published: input.published,
			published_at,
			updated_at: now
		})
		.eq('id', postId);

	if (error) throw error;
}

export async function deletePostById(supabase: SupabaseClient, postId: number): Promise<void> {
	const { error } = await supabase.from('posts').delete().eq('id', postId);
	if (error) throw error;
}

/** 공개 글 전체 — All Posts 등 */
export async function listPublishedPosts(supabase: SupabaseClient): Promise<PostListRow[]> {
	const { data, error } = await supabase
		.from('posts')
		.select('id, title, published, published_at, updated_at, word_count, view_count')
		.eq('published', true)
		.order('published_at', { ascending: false });

	if (error) {
		console.error('listPublishedPosts', error);
		return [];
	}
	return (data ?? []) as PostListRow[];
}

/** id 목록에 해당하는 메타 — 폴더 `posts` 배열 순서는 호출 측에서 맞춤 */
export async function listPostsByIds(
	supabase: SupabaseClient,
	ids: number[],
	opts: { onlyPublished: boolean }
): Promise<PostListRow[]> {
	if (ids.length === 0) return [];
	let q = supabase
		.from('posts')
		.select('id, title, published, published_at, updated_at, word_count, view_count')
		.in('id', ids);

	if (opts.onlyPublished) q = q.eq('published', true);

	const { data, error } = await q;
	if (error) {
		console.error('listPostsByIds', error);
		return [];
	}
	const rows = (data ?? []) as PostListRow[];
	const want = new Set(ids);
	const filtered = rows.filter((r) => want.has(r.id));
	filtered.sort(comparePostsByPostedDateDesc);
	return filtered;
}
