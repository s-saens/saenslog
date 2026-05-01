import { getAllPosts, getBlogItems, getBlogPost } from '$lib/server/blog';
import { listPostsDirectChildren, listPostsInSubtree } from '$lib/server/posts';
import type { PageServerLoad } from './$types';

type ListPost = {
	title: string;
	path: string;
	category: string;
	date: string;
	wordCount: number;
	tistory?: string;
};

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
			postSlug: dbRow.slug as string
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
			source: 'fs' as const
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
		allPosts: mergedAll
	};
};
