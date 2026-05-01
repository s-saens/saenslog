import { renderMarkdownToHtml } from '$lib/markdownCompile';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PostListRow = {
	id: number;
	slug: string;
	title: string;
	category: string | null;
	published: boolean;
	published_at: string | null;
	updated_at: string;
	word_count: number;
};

export type PostFullRow = PostListRow & {
	tags: string[];
	content_md: string;
	content_html: string;
	author_id: string;
	created_at: string;
};

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

export function parseTags(raw: string | null | undefined): string[] {
	if (!raw) return [];
	return raw
		.split(/[,，]/)
		.map((t) => t.trim())
		.filter(Boolean);
}

export async function listPostsAdmin(supabase: SupabaseClient): Promise<PostListRow[]> {
	const { data, error } = await supabase
		.from('posts')
		.select('id, slug, title, category, published, published_at, updated_at, word_count')
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
		category: string | null;
		tags: string[];
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
			category: input.category?.trim() || null,
			tags: input.tags,
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
	slug: string,
	input: {
		title: string;
		category: string | null;
		tags: string[];
		content_md: string;
		published: boolean;
	}
): Promise<void> {
	const content_html = renderMarkdownToHtml(input.content_md);
	const word_count = countWords(input.content_md);
	const now = new Date().toISOString();

	const { data: existing, error: fetchErr } = await supabase
		.from('posts')
		.select('published, published_at')
		.eq('slug', slug)
		.single();

	if (fetchErr) throw fetchErr;

	let published_at: string | null = existing.published_at as string | null;
	if (input.published) {
		if (!existing.published) {
			published_at = now;
		}
	} else {
		published_at = null;
	}

	const { error } = await supabase
		.from('posts')
		.update({
			title: input.title.trim(),
			category: input.category?.trim() || null,
			tags: input.tags,
			content_md: input.content_md,
			content_html,
			word_count,
			published: input.published,
			published_at,
			updated_at: now
		})
		.eq('slug', slug);

	if (error) throw error;
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
		.select('id, slug, title, category, published, published_at, updated_at, word_count');

	if (opts.onlyPublished) q = q.eq('published', true);

	const { data, error } = await q;
	if (error) throw error;

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
		.select('id, slug, title, category, published, published_at, updated_at, word_count');

	if (opts.onlyPublished) q = q.eq('published', true);

	const { data, error } = await q;
	if (error) throw error;

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
