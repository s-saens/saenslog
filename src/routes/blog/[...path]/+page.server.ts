import { error, fail } from '@sveltejs/kit';
import path from 'path';
import { env as privateEnv } from '$env/dynamic/private';
import {
	gateGuestCommentAttempt,
	hashCommentClientIp,
	recordGuestCommentAttempt
} from '$lib/server/commentGuestRateLimit';
import {
	ancestorFolderChain,
	fetchAllFolders,
	findFolderContainingPost,
	foldersById,
	removePostFromAllFolders,
	rootFolderIds,
	toFolderInfo
} from '$lib/server/folders';
import {
	deletePostById,
	getPostById,
	listOrphanPosts,
	listPostsByIds,
	listPublishedPosts
} from '$lib/server/posts';
import { tryCreateSupabaseServiceClient } from '$lib/server/supabaseService';
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
	author_id: string | null;
	guest_name: string | null;
	parent_id: number | null;
	created_at: string;
	profiles: { username: string; avatar_url: string | null } | null;
};

function commentPostRef(postId: number): string {
	return String(postId);
}

async function loadCommentsForPost(postId: number, locals: App.Locals): Promise<CommentRow[]> {
	const ref = commentPostRef(postId);
	const { data, error: qErr } = await locals.supabase
		.from('comments')
		.select(
			'id, content, author_id, guest_name, parent_id, created_at, profiles(username, avatar_url)'
		)
		.eq('post_slug', ref)
		.order('created_at', { ascending: true });

	if (qErr) {
		console.error('comments load', qErr);
		return [];
	}
	const rows = data ?? [];
	return rows.map((row) => {
		const p = row.profiles;
		const profiles =
			p == null
				? null
				: Array.isArray(p)
					? ((p[0] as { username: string; avatar_url: string | null } | undefined) ?? null)
					: (p as { username: string; avatar_url: string | null });
		return {
			id: row.id,
			content: row.content,
			author_id: row.author_id as string | null,
			guest_name: (row as { guest_name?: string | null }).guest_name ?? null,
			parent_id: row.parent_id,
			created_at: row.created_at,
			profiles
		};
	});
}

function postRowToCard(
	row: {
		title: string;
		published_at: string | null;
		updated_at: string;
		word_count: number;
		id: number;
	},
	category: string
): ListPost {
	return {
		title: row.title,
		path: String(row.id),
		category,
		date: row.published_at ?? row.updated_at,
		wordCount: row.word_count
	};
}

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	const { profile } = await parent();
	const isAdmin = profile?.role === 'admin';
	const pathParam = params.path || '';
	const segments = pathParam.split('/').filter(Boolean);
	const onlyPub = !isAdmin;

	const allFolders = await fetchAllFolders(locals.supabase);
	const byId = foldersById(allFolders);

	/** 단일 세그먼트 숫자 → 글 */
	if (segments.length === 1 && /^\d+$/.test(segments[0])) {
		const postId = Number(segments[0]);
		const dbRow = await getPostById(locals.supabase, postId);
		if (!dbRow || (onlyPub && !dbRow.published)) {
			error(404, '글을 찾을 수 없습니다.');
		}

		const hostFolder = findFolderContainingPost(postId, allFolders);
		const chain = hostFolder ? ancestorFolderChain(hostFolder.id, allFolders) : [];
		const postBreadcrumb = [
			{ label: 'Blog', path: '/blog' },
			...chain.map((f) => ({
				label: f.name,
				path: `/blog/f/${f.id}`
			}))
		];

		const tags = chain.map((f) => f.name);
		const category =
			chain.length > 1
				? chain
						.map((f) => f.name)
						.slice(0, -1)
						.join('/')
				: '';

		const comments = await loadCommentsForPost(postId, locals);

		return {
			path: String(postId),
			pathParam,
			segments,
			breadcrumb: postBreadcrumb,
			isPost: true,
			isAdmin,
			postId,
			title: dbRow.title,
			date: dbRow.published_at ?? dbRow.updated_at,
			created: dbRow.created_at,
			updated: dbRow.updated_at,
			category,
			content: dbRow.content_html as string,
			wordCount: dbRow.word_count as number,
			tags,
			comments
		};
	}

	/** /blog/f/{id}/ 폴더 목록 */
	if (segments[0] === 'f' && segments[1] && /^\d+$/.test(segments[1]) && segments.length === 2) {
		const folderId = Number(segments[1]);
		const folder = byId.get(folderId);
		if (!folder) error(404, '폴더를 찾을 수 없습니다.');

		const chain = ancestorFolderChain(folderId, allFolders);
		const breadcrumb = [
			{ label: 'Blog', path: '/blog' },
			...chain.map((f) => ({
				label: f.name,
				path: `/blog/f/${f.id}`
			}))
		];

		const metaRows = await listPublishedPosts(locals.supabase);
		const postMetaById = new Map(metaRows.map((r) => [r.id, r]));

		const subFolderRows = folder.subfolders
			.map((id) => byId.get(id))
			.filter(Boolean) as typeof allFolders;
		subFolderRows.sort((a, b) => a.name.localeCompare(b.name));

		const folders = subFolderRows.map((f) => toFolderInfo(f, allFolders, postMetaById));

		const postIdsOrdered = folder.posts;
		const postRows = await listPostsByIds(locals.supabase, postIdsOrdered, {
			onlyPublished: onlyPub
		});
		const rowById = new Map(postRows.map((r) => [r.id, r]));
		const posts: ListPost[] = postIdsOrdered
			.map((id) => rowById.get(id))
			.filter(Boolean)
			.map((r) => postRowToCard(r!, folder.name));

		return {
			path: pathParam,
			pathParam,
			segments,
			breadcrumb,
			isPost: false,
			isAdmin,
			currentFolderId: folderId,
			folders,
			posts,
			allPosts: Promise.resolve([] as ListPost[]),
			postId: null as number | null,
			comments: [] as CommentRow[]
		};
	}

	if (segments.length === 0) {
		const metaRows = await listPublishedPosts(locals.supabase);
		const postMetaById = new Map(metaRows.map((r) => [r.id, r]));

		const roots = rootFolderIds(allFolders)
			.map((id) => byId.get(id))
			.filter(Boolean) as typeof allFolders;
		roots.sort((a, b) => a.name.localeCompare(b.name));
		const folders = roots.map((f) => toFolderInfo(f, allFolders, postMetaById));

		const folderPostIdSet = new Set<number>();
		for (const f of allFolders) for (const pid of f.posts) folderPostIdSet.add(pid);

		const orphanRows = await listOrphanPosts(locals.supabase, folderPostIdSet, {
			onlyPublished: onlyPub
		});
		const posts = orphanRows
			.map((r) => postRowToCard(r, ''))
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		const allPosts = listPublishedPosts(locals.supabase).then((rows) =>
			rows
				.map((r) => postRowToCard(r, ''))
				.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		);

		return {
			path: '',
			pathParam,
			segments,
			breadcrumb: [{ label: 'Blog', path: '/blog' }],
			isPost: false,
			isAdmin,
			currentFolderId: null as number | null,
			folders,
			posts,
			allPosts,
			postId: null as number | null,
			comments: [] as CommentRow[]
		};
	}

	error(404, '찾을 수 없습니다.');
};

export const actions: Actions = {
	addComment: async ({ request, locals, getClientAddress }) => {
		const form = await request.formData();
		const post_slug = String(form.get('post_slug') ?? '').trim();
		const content = String(form.get('content') ?? '').trim();
		const guest_name_raw = String(form.get('guest_name') ?? '').trim();
		const parentRaw = form.get('parent_id');
		const parentStr = parentRaw == null ? '' : String(parentRaw).trim();
		const parent_id = parentStr === '' ? null : Number(parentStr);

		if (!post_slug || !content) return fail(400, { message: '내용을 확인하세요.' });
		if (content.length > 12_000) return fail(400, { message: '댓글이 너무 깁니다.' });
		if (parent_id !== null && !Number.isFinite(parent_id)) {
			return fail(400, { message: '잘못된 답글 대상입니다.' });
		}

		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (user) {
			if (guest_name_raw)
				return fail(400, { message: '로그인 상태에서는 닉네임 필드를 비워 주세요.' });

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

			const { error: insErr } = await locals.supabase.from('comments').insert({
				post_slug,
				author_id: user.id,
				guest_name: null,
				content,
				parent_id
			});

			if (insErr) return fail(400, { message: insErr.message });
			return { ok: true };
		}

		const guest_name = guest_name_raw;
		if (!guest_name || guest_name.length > 40) {
			return fail(400, { message: '닉네임은 1~40자로 입력해 주세요.' });
		}

		const service = tryCreateSupabaseServiceClient();
		const rateSecret = privateEnv.COMMENT_RATE_LIMIT_SECRET ?? privateEnv.SUPABASE_SECRET_KEY ?? '';
		if (!service || !rateSecret) {
			return fail(503, {
				message:
					'비회원 댓글을 처리할 수 없습니다. 서버에 SUPABASE_SECRET_KEY(및 선택적으로 COMMENT_RATE_LIMIT_SECRET)를 설정했는지 확인하세요.'
			});
		}

		const ip = getClientAddress() ?? 'unknown';
		const ipHash = hashCommentClientIp(rateSecret, ip);

		const gate = await gateGuestCommentAttempt(service, ipHash);
		if (!gate.ok) {
			return fail(gate.blocked ? 429 : 503, {
				message: gate.message,
				...(gate.blocked ? { blocked: true } : {})
			});
		}

		if (parent_id !== null) {
			const { data: parentRow } = await service
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

		const recorded = await recordGuestCommentAttempt(service, ipHash);
		if (!recorded.ok)
			return fail(503, { message: '댓글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.' });

		const { error: insErr } = await service.from('comments').insert({
			post_slug,
			author_id: null,
			guest_name,
			content,
			parent_id
		});

		if (insErr) return fail(400, { message: insErr.message });
		return { ok: true };
	},

	editComment: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('comment_id'));
		const content = String(form.get('content') ?? '').trim();
		if (!Number.isFinite(id) || !content) return fail(400, { message: '잘못된 요청입니다.' });

		const { error: upErr } = await locals.supabase
			.from('comments')
			.update({ content, updated_at: new Date().toISOString() })
			.eq('id', id);

		if (upErr) return fail(400, { message: upErr.message });
		return { ok: true };
	},

	deletePost: async ({ request, locals }) => {
		const form = await request.formData();
		const idRaw = String(form.get('post_id') ?? '').trim();
		const postId = Number(idRaw);
		if (!Number.isFinite(postId) || postId <= 0) {
			return fail(400, { message: '삭제할 글 id가 없습니다.' });
		}

		const folders = await fetchAllFolders(locals.supabase);
		await removePostFromAllFolders(locals.supabase, folders, postId);
		await deletePostById(locals.supabase, postId);

		const assetDir = path.join(process.cwd(), 'static', 'blog', String(postId));
		try {
			const fs = await import('node:fs/promises');
			await fs.rm(assetDir, { recursive: true, force: true });
		} catch {
			/* 미디어 폴더 없음 등 */
		}

		return { ok: true };
	}
};
