import { renderMarkdownToHtml } from '$lib/markdownCompile';
import {
	moveBlogPostAssetFolder,
	rewriteBlogAssetPathsInMarkdown
} from '$lib/server/blogPostAssets';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PostListRow = {
	id: number;
	slug: string;
	title: string;
	published: boolean;
	published_at: string | null;
	updated_at: string;
	word_count: number;
};

export type PostFullRow = PostListRow & {
	content_md: string;
	content_html: string;
	author_id: string;
	created_at: string;
};

/** 목록·메타에 쓰는 상위 경로 (예: `Dev/AI/2` → `Dev/AI`) */
export function categoryLabelFromSlug(slug: string): string {
	const i = slug.lastIndexOf('/');
	if (i <= 0) return '';
	return slug.slice(0, i);
}

/** 슬러그 경로 세그먼트 — 마지막 조각(글 식별자) 제외, 태그/분류 칩 표시용 */
export function pathSegmentsBeforeLeaf(slug: string): string[] {
	const parts = slug.split('/').filter(Boolean);
	if (parts.length <= 1) return [];
	return parts.slice(0, -1);
}

function countWords(md: string): number {
	const t = md.trim();
	if (!t) return 0;
	return t.split(/\s+/).filter(Boolean).length;
}

export function normalizeSlug(raw: string): string {
	const s = raw.trim().replace(/^\/+|\/+$/g, '');
	if (!s) throw new Error('슬러그가 비어 있습니다.');
	if (s.includes('..')) throw new Error('슬러그에 .. 를 쓸 수 없습니다.');
	return s;
}

export async function listPostsAdmin(supabase: SupabaseClient): Promise<PostListRow[]> {
	const { data, error } = await supabase
		.from('posts')
		.select('id, slug, title, published, published_at, updated_at, word_count')
		.order('updated_at', { ascending: false });

	if (error) throw error;
	return (data ?? []) as PostListRow[];
}

export async function getPostBySlug(
	supabase: SupabaseClient,
	slug: string
): Promise<PostFullRow | null> {
	const { data, error } = await supabase.from('posts').select('*').eq('slug', slug).maybeSingle();

	if (error) throw error;
	return data as PostFullRow | null;
}

export async function insertPost(
	supabase: SupabaseClient,
	input: {
		slug: string;
		title: string;
		content_md: string;
		published: boolean;
	},
	authorId: string
): Promise<{ id: number }> {
	const slug = normalizeSlug(input.slug);
	const content_html = renderMarkdownToHtml(input.content_md);
	const word_count = countWords(input.content_md);
	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from('posts')
		.insert({
			slug,
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

export async function updatePost(
	supabase: SupabaseClient,
	currentSlug: string,
	input: {
		slug?: string;
		title: string;
		content_md: string;
		published: boolean;
	}
): Promise<{ slug: string }> {
	const now = new Date().toISOString();
	const nextSlug = input.slug !== undefined ? normalizeSlug(input.slug) : currentSlug;

	const { data: current, error: fetchErr } = await supabase
		.from('posts')
		.select('id, published, published_at')
		.eq('slug', currentSlug)
		.single();

	if (fetchErr) throw fetchErr;

	if (nextSlug !== currentSlug) {
		const { data: taken, error: takenErr } = await supabase
			.from('posts')
			.select('id')
			.eq('slug', nextSlug)
			.maybeSingle();

		if (takenErr) throw takenErr;
		if (taken && (taken as { id: number }).id !== (current as { id: number }).id) {
			throw new Error('이미 같은 슬러그를 쓰는 글이 있습니다.');
		}
	}

	let published_at: string | null = current.published_at as string | null;
	if (input.published) {
		if (!current.published) {
			published_at = now;
		}
	} else {
		published_at = null;
	}

	let content_md = input.content_md;
	if (nextSlug !== currentSlug) {
		await moveBlogPostAssetFolder(currentSlug, nextSlug);
		content_md = rewriteBlogAssetPathsInMarkdown(content_md, currentSlug, nextSlug);
	}

	const content_html = renderMarkdownToHtml(content_md);
	const word_count = countWords(content_md);

	const row: Record<string, unknown> = {
		title: input.title.trim(),
		content_md,
		content_html,
		word_count,
		published: input.published,
		published_at,
		updated_at: now
	};
	if (nextSlug !== currentSlug) {
		row.slug = nextSlug;
	}

	const { error } = await supabase.from('posts').update(row).eq('slug', currentSlug);

	if (error) throw error;
	return { slug: nextSlug };
}

export async function deletePostBySlug(supabase: SupabaseClient, slug: string): Promise<void> {
	const { error } = await supabase.from('posts').delete().eq('slug', slug);
	if (error) throw error;
}

/** 카테고리 경로의 바로 아래 글만 (파일 시스템 목록과 동일한 깊이) */
export async function listPostsDirectChildren(
	supabase: SupabaseClient,
	dirPath: string,
	opts: { onlyPublished: boolean }
): Promise<PostListRow[]> {
	let q = supabase
		.from('posts')
		.select('id, slug, title, published, published_at, updated_at, word_count');

	if (opts.onlyPublished) q = q.eq('published', true);

	const { data, error } = await q;
	if (error) {
		console.error('listPostsDirectChildren', error);
		return [];
	}

	const rows = (data ?? []) as PostListRow[];
	const prefix = dirPath ? `${dirPath}/` : '';

	return rows.filter((row) => {
		if (opts.onlyPublished && !row.published) return false;
		const slug = row.slug;
		if (!dirPath) {
			return !slug.includes('/');
		}
		if (!slug.startsWith(prefix)) return false;
		const rest = slug.slice(prefix.length);
		return rest.length > 0 && !rest.includes('/');
	});
}

/** basePath 이하 전체 글 (allPosts 섹션·하위 트리) */
export async function listPostsInSubtree(
	supabase: SupabaseClient,
	basePath: string,
	opts: { onlyPublished: boolean }
): Promise<PostListRow[]> {
	let q = supabase
		.from('posts')
		.select('id, slug, title, published, published_at, updated_at, word_count');

	if (opts.onlyPublished) q = q.eq('published', true);

	const { data, error } = await q;
	if (error) {
		console.error('listPostsInSubtree', error);
		return [];
	}

	const rows = (data ?? []) as PostListRow[];
	if (!basePath) {
		return rows.filter((r) => !opts.onlyPublished || r.published);
	}
	const prefix = `${basePath}/`;
	return rows.filter((row) => {
		if (opts.onlyPublished && !row.published) return false;
		return row.slug.startsWith(prefix) || row.slug === basePath;
	});
}
