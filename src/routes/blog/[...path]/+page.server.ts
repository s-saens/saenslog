import { fail } from '@sveltejs/kit';
import { getAllPosts, getBlogItems, getBlogPost } from '$lib/server/blog';
import { listPostsDirectChildren, listPostsInSubtree } from '$lib/server/posts';
import type { Actions, PageServerLoad } from './$types';

type ListPost = {
	title: string;
	path: string;
	category: string;
	date: string;
	wordCount: number;
	tistory?: string;
};

type CommentRow = {
	id: number;
	content: string;
	author_id: string;
	parent_id: number | null;
	created_at: string;
	profiles: { username: string; avatar_url: string | null } | null;
};

async function loadCommentsForSlug(postSlug: string, locals: App.Locals): Promise<CommentRow[]> {
	const { data, error } = await locals.supabase
		.from('comments')
		.select('id, content, author_id, parent_id, created_at, profiles(username, avatar_url)')
		.eq('post_slug', postSlug)
		.order('created_at', { ascending: true });

	if (error) {
		console.error('comments load', error);
		return [];
	}
	const rows = data ?? [];
	return rows.map((row) => {
		const p = row.profiles;
		const profiles =
			p == null
				? null
				: Array.isArray(p)
					? (p[0] as { username: string; avatar_url: string | null } | undefined) ?? null
					: (p as { username: string; avatar_url: string | null });
		return {
			id: row.id,
			content: row.content,
			author_id: row.author_id,
			parent_id: row.parent_id,
			created_at: row.created_at,
			profiles
		};
	});
}

function dbRowToCard(row: {
	slug: string;
	title: string;
	category: string | null;
	published_at: string | null;
	updated_at: string;
	word_count: number;
}): ListPost {
	return {
		title: row.title,
		path: row.slug,
		category: row.category ?? '',
		date: row.published_at ?? row.updated_at,
		wordCount: row.word_count
	};
}

function mergeByPath(fsItems: ListPost[], dbItems: ListPost[]): ListPost[] {
	const map = new Map<string, ListPost>();
	for (const p of fsItems) {
		map.set(p.path, p);
	}
	for (const p of dbItems) {
		map.set(p.path, p);
	}
	return [...map.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	const { profile } = await parent();
	const isAdmin = profile?.role === 'admin';
	const path = params.path || '';
	const segments = path.split('/').filter(Boolean);
	const onlyPub = !isAdmin;

	const breadcrumb = [
		{ label: 'Blog', path: '/blog' },
		...segments.map((segment, index) => {
			const segmentPath = segments.slice(0, index + 1).join('/');
			return {
				label: segment,
				path: `/blog/${segmentPath}`
			};
		})
	];

	const { data: dbRow } = await locals.supabase.from('posts').select('*').eq('slug', path).maybeSingle();

	if (dbRow) {
		const postBreadcrumb = [
			{ label: 'Blog', path: '/blog' },
			...segments.slice(0, -1).map((segment, index) => {
				const segmentPath = segments.slice(0, index + 1).join('/');
				return {
					label: segment,
					path: `/blog/${segmentPath}`
				};
			})
		];

		const comments = await loadCommentsForSlug(path, locals);

		return {
			path,
			segments,
			breadcrumb: postBreadcrumb,
			isPost: true,
			title: dbRow.title,
			date: dbRow.published_at ?? dbRow.updated_at,
			category: dbRow.category ?? '',
			content: dbRow.content_html as string,
			wordCount: dbRow.word_count as number,
			tags: (dbRow.tags as string[]) ?? [],
			source: 'db' as const,
			dbPostId: dbRow.id as number,
			postSlug: dbRow.slug as string,
			comments
		};
	}

	const fsPost = getBlogPost(path);
	if (fsPost) {
		const postBreadcrumb = [
			{ label: 'Blog', path: '/blog' },
			...segments.slice(0, -1).map((segment, index) => {
				const segmentPath = segments.slice(0, index + 1).join('/');
				return {
					label: segment,
					path: `/blog/${segmentPath}`
				};
			})
		];

		const comments = await loadCommentsForSlug(path, locals);

		return {
			path,
			segments,
			breadcrumb: postBreadcrumb,
			isPost: true,
			title: fsPost.title,
			date: fsPost.date,
			category: fsPost.category,
			content: fsPost.content,
			wordCount: fsPost.wordCount,
			tags: fsPost.tags,
			...(fsPost.tistory ? { tistory: fsPost.tistory } : {}),
			source: 'fs' as const,
			comments
		};
	}

	const { folders, posts } = getBlogItems(path);
	const dbDirect = await listPostsDirectChildren(locals.supabase, path, { onlyPublished: onlyPub });
	const dbCards = dbDirect.map(dbRowToCard);
	const fsCards: ListPost[] = posts.map((p) => ({
		title: p.title,
		path: p.path,
		category: p.category,
		date: p.date,
		wordCount: p.wordCount,
		...(p.tistory ? { tistory: p.tistory } : {})
	}));
	const mergedPosts = mergeByPath(fsCards, dbCards);

	const fsAll = getAllPosts(path);
	const dbSubtree = await listPostsInSubtree(locals.supabase, path, { onlyPublished: onlyPub });
	const dbAllCards = dbSubtree.map(dbRowToCard);
	const fsAllCards: ListPost[] = fsAll.map((p) => ({
		title: p.title,
		path: p.path,
		category: p.category,
		date: p.date,
		wordCount: p.wordCount,
		...(p.tistory ? { tistory: p.tistory } : {})
	}));
	const mergedAll = mergeByPath(fsAllCards, dbAllCards);

	return {
		path,
		segments,
		breadcrumb,
		isPost: false,
		folders: folders.map((folder) => ({
			name: folder.name,
			path: folder.path,
			folderCount: folder.folderCount,
			postCount: folder.postCount,
			totalFolderCount: folder.totalFolderCount,
			totalPostCount: folder.totalPostCount,
			date: folder.date
		})),
		posts: mergedPosts,
		allPosts: mergedAll,
		comments: [] as CommentRow[]
	};
};

export const actions: Actions = {
	addComment: async ({ request, locals }) => {
		const form = await request.formData();
		const post_slug = String(form.get('post_slug') ?? '').trim();
		const content = String(form.get('content') ?? '').trim();
		const parentRaw = form.get('parent_id');
		const parentStr = parentRaw == null ? '' : String(parentRaw).trim();
		const parent_id = parentStr === '' ? null : Number(parentStr);

		if (!post_slug || !content) return fail(400, { message: '내용을 확인하세요.' });
		if (parent_id !== null && !Number.isFinite(parent_id)) {
			return fail(400, { message: '잘못된 답글 대상입니다.' });
		}

		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { message: '로그인이 필요합니다.' });

		if (parent_id !== null) {
			const { data: parentRow } = await locals.supabase
				.from('comments')
				.select('id, parent_id, post_slug')
				.eq('id', parent_id)
				.maybeSingle();

			if (!parentRow || parentRow.post_slug !== post_slug) {
				return fail(400, { message: '답글 대상을 찾을 수 없습니다.' });
			}
			if (parentRow.parent_id !== null) {
				return fail(400, { message: '답글에는 또 답글을 달 수 없습니다.' });
			}
		}

		const { error } = await locals.supabase.from('comments').insert({
			post_slug,
			author_id: user.id,
			content,
			parent_id
		});

		if (error) return fail(400, { message: error.message });
		return { ok: true };
	},

	editComment: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('comment_id'));
		const content = String(form.get('content') ?? '').trim();
		if (!Number.isFinite(id) || !content) return fail(400, { message: '잘못된 요청입니다.' });

		const { error } = await locals.supabase
			.from('comments')
			.update({ content, updated_at: new Date().toISOString() })
			.eq('id', id);

		if (error) return fail(400, { message: error.message });
		return { ok: true };
	},

	deleteComment: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('comment_id'));
		if (!Number.isFinite(id)) return fail(400, { message: '잘못된 요청입니다.' });

		const { error } = await locals.supabase.from('comments').delete().eq('id', id);
		if (error) return fail(400, { message: error.message });
		return { ok: true };
	}
};
