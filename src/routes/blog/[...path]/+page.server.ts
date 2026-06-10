import { resolve } from '$app/paths';
import { env as privateEnv } from '$env/dynamic/private';
import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import path from 'path';
import {
	gateGuestCommentAttempt,
	hashCommentClientIp,
	recordGuestCommentAttempt
} from '$lib/server/commentGuestRateLimit';
import { gateLikeAction, recordLikeActionAttempt } from '$lib/server/likeRateLimit';
import {
	ancestorFolderChain,
	BLOG_ROOT_FOLDER_ID,
	createFolderUnderParent,
	fetchAllFolders,
	findFolderContainingPost,
	folderDisplayLabel,
	folderPathLabelExcludingRoot,
	folderMovePickerEntries,
	foldersById,
	movePostToFolder,
	removePostFromAllFolders,
	toFolderInfo,
	type FolderRow
} from '$lib/server/folders';
import {
	deletePostById,
	getPostById,
	listPostsByIds,
	listPublishedPosts,
	comparePostsByPostedDateDesc,
	type PostListRow
} from '$lib/server/posts';
import { thrownMessageForActionFail } from '$lib/formActionFailure';
import { plainTextFromMarkdown, SEO_DEFAULT_DESCRIPTION } from '$lib/seo';
import { renderMarkdownToHtml } from '$lib/server/markdown';
import { tryCreateSupabaseServiceClient } from '$lib/server/supabaseService';
import type { Actions, PageServerLoad } from './$types';

type ListPost = {
	title: string;
	path: string;
	category: string;
	date: string;
	wordCount: number;
	viewCount: number;
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

async function loadPostLikeSummary(
	supabase: App.Locals['supabase'],
	service: ReturnType<typeof tryCreateSupabaseServiceClient>,
	postId: number,
	userId: string | null,
	ipHash: string | null
): Promise<{ count: number; liked: boolean }> {
	const countPromise = supabase
		.from('post_likes')
		.select('*', { count: 'exact', head: true })
		.eq('post_id', postId);

	const likedPromise = userId
		? supabase
				.from('post_likes')
				.select('id')
				.eq('post_id', postId)
				.eq('user_id', userId)
				.maybeSingle()
				.then(({ data }) => !!data)
		: ipHash && service
			? service
					.from('post_likes')
					.select('id')
					.eq('post_id', postId)
					.eq('ip_hash', ipHash)
					.is('user_id', null)
					.maybeSingle()
					.then(({ data }) => !!data)
			: Promise.resolve(false);

	const [{ count, error: cErr }, liked] = await Promise.all([countPromise, likedPromise]);
	if (cErr) console.error('post_likes count', cErr);

	return { count: count ?? 0, liked };
}

function buildCommentLikeMap(
	commentIds: number[],
	rows: { comment_id: number; user_id: string | null; ip_hash: string | null }[],
	userId: string | null,
	ipHash: string | null
): Record<string, { count: number; liked: boolean }> {
	const out: Record<string, { count: number; liked: boolean }> = {};
	for (const id of commentIds) out[String(id)] = { count: 0, liked: false };
	for (const row of rows) {
		const key = String(row.comment_id);
		const cur = out[key];
		if (!cur) continue;
		cur.count++;
		if (userId && row.user_id === userId) cur.liked = true;
		else if (!userId && ipHash && row.user_id === null && row.ip_hash === ipHash) cur.liked = true;
	}
	return out;
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
		view_count?: number | null;
	},
	folderLabel: string
): ListPost {
	return {
		title: row.title,
		path: String(row.id),
		category: folderLabel,
		date: row.published_at ?? row.updated_at,
		wordCount: row.word_count,
		viewCount: Number(row.view_count ?? 0)
	};
}

function folderListingBreadcrumbItems(
	chainExcludingRoot: FolderRow[]
): { label: string; path: string }[] {
	return chainExcludingRoot.map((f) => ({
		label: folderDisplayLabel(f),
		path: `/blog/f/${f.id}`
	}));
}

async function loadBlogFolderListing(
	supabase: App.Locals['supabase'],
	allFolders: FolderRow[],
	folderId: number,
	pathParam: string,
	segments: string[],
	opts: {
		onlyPublished: boolean;
		isAdmin: boolean;
		allPosts: Promise<ListPost[]>;
		/** 루트 등에서 한 번 조회한 공개 목록을 재사용(All Posts·폴더 카드 공통) */
		preloadedPublishedRows?: PostListRow[];
	}
) {
	const byId = foldersById(allFolders);
	const folder = byId.get(folderId);
	if (!folder) error(404, '폴더를 찾을 수 없습니다.');

	const chainNoRoot = ancestorFolderChain(folderId, allFolders).filter(
		(f) => f.id !== BLOG_ROOT_FOLDER_ID
	);

	const breadcrumb =
		folderId === BLOG_ROOT_FOLDER_ID
			? [{ label: 'Blog', path: '/blog' }]
			: [{ label: 'Blog', path: '/blog' }, ...folderListingBreadcrumbItems(chainNoRoot)];

	const [metaRows, postRows] = await Promise.all([
		opts.preloadedPublishedRows
			? Promise.resolve(opts.preloadedPublishedRows)
			: listPublishedPosts(supabase),
		listPostsByIds(supabase, folder.posts, { onlyPublished: opts.onlyPublished })
	]);
	const postMetaById = new Map(metaRows.map((r) => [r.id, r]));

	const subFolderRows = folder.subfolders.map((id) => byId.get(id)).filter(Boolean) as FolderRow[];
	subFolderRows.sort((a, b) =>
		(a.name ?? '').localeCompare(b.name ?? '', 'ko', { sensitivity: 'base' })
	);

	const folders = subFolderRows.map((f) => toFolderInfo(f, allFolders, postMetaById));
	const folderTitle = folderId === BLOG_ROOT_FOLDER_ID ? 'Blog' : folderDisplayLabel(folder);

	const listPathLabel = folderPathLabelExcludingRoot(folderId, allFolders);
	const posts: ListPost[] = postRows.map((r) => postRowToCard(r, listPathLabel));

	return {
		path: folderId === BLOG_ROOT_FOLDER_ID ? '' : pathParam,
		pathParam,
		segments,
		breadcrumb,
		isPost: false,
		isAdmin: opts.isAdmin,
		currentFolderId: folderId,
		folders,
		posts,
		allPosts: opts.allPosts,
		postId: null as number | null,
		comments: [] as CommentRow[],
		postLikeCount: 0,
		postLikedByViewer: false,
		commentLikesById: {} as Record<string, { count: number; liked: boolean }>,
		postFolderId: null as number | null,
		folderMoveTargets: [] as { id: number; pathLabel: string }[],
		seo: {
			title: folderTitle,
			description:
				folderId === BLOG_ROOT_FOLDER_ID
					? '블로그 글과 폴더 목록입니다.'
					: `"${folderTitle}" 폴더의 글 목록입니다.`,
			canonicalPath: folderId === BLOG_ROOT_FOLDER_ID ? '/blog' : `/blog/f/${folderId}`
		}
	};
}

export const load: PageServerLoad = async ({ params, locals, getClientAddress }) => {
	const pathParam = params.path || '';
	const segments = pathParam.split('/').filter(Boolean);

	// 인증·권한·폴더 트리를 병렬로 시작 — safeGetUser는 요청당 1회 메모이즈라 layout과 공유
	const userPromise = locals.safeGetUser();
	const isAdminPromise = userPromise.then(async (user) => {
		if (!user) return false;
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();
		return profile?.role === 'admin';
	});
	const foldersPromise = fetchAllFolders(locals.supabase);

	/** 단일 세그먼트 숫자 → 글 */
	if (segments.length === 1 && /^\d+$/.test(segments[0])) {
		const postId = Number(segments[0]);

		const rateSecret = privateEnv.COMMENT_RATE_LIMIT_SECRET ?? privateEnv.SUPABASE_SECRET_KEY ?? '';
		const viewerIpHash = rateSecret
			? hashCommentClientIp(rateSecret, getClientAddress() ?? 'unknown')
			: null;
		const serviceClient = tryCreateSupabaseServiceClient();

		const postPromise = getPostById(locals.supabase, postId);
		const commentsPromise = loadCommentsForPost(postId, locals);
		const postLikePromise = userPromise.then((user) =>
			loadPostLikeSummary(locals.supabase, serviceClient, postId, user?.id ?? null, viewerIpHash)
		);
		const commentLikesPromise = Promise.all([commentsPromise, userPromise]).then(
			async ([loadedComments, user]) => {
				const commentIds = loadedComments.map((c) => c.id);
				if (commentIds.length === 0) {
					return {} as Record<string, { count: number; liked: boolean }>;
				}
				const { data: likeRows, error: lrErr } = await locals.supabase
					.from('comment_likes')
					.select('comment_id, user_id, ip_hash')
					.in('comment_id', commentIds);
				if (lrErr) console.error('comment_likes load', lrErr);
				return buildCommentLikeMap(commentIds, likeRows ?? [], user?.id ?? null, viewerIpHash);
			}
		);
		const viewCountPromise = postPromise.then(async (row) => {
			if (!row?.published) return Number(row?.view_count ?? 0);
			const { data: counted, error: rpcErr } = await locals.supabase.rpc('increment_post_view', {
				post_id: postId
			});
			if (!rpcErr && counted != null) return Number(counted);
			if (rpcErr) console.warn('[increment_post_view]', rpcErr.message);
			return Number(row.view_count ?? 0);
		});

		const [isAdmin, allFolders, dbRow, comments, postLike, commentLikesById, viewCount] =
			await Promise.all([
				isAdminPromise,
				foldersPromise,
				postPromise,
				commentsPromise,
				postLikePromise,
				commentLikesPromise,
				viewCountPromise
			]);

		if (!dbRow || (!isAdmin && !dbRow.published)) {
			error(404, '글을 찾을 수 없습니다.');
		}

		const hostFolder = findFolderContainingPost(postId, allFolders);
		const chain = hostFolder
			? ancestorFolderChain(hostFolder.id, allFolders).filter((f) => f.id !== BLOG_ROOT_FOLDER_ID)
			: [];
		const postBreadcrumb = [
			{ label: 'Blog', path: '/blog' },
			...folderListingBreadcrumbItems(chain)
		];

		const tags = chain.map((f) => folderDisplayLabel(f));
		const category =
			chain.length > 1
				? chain
						.map((f) => folderDisplayLabel(f))
						.slice(0, -1)
						.join('/')
				: '';

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
			published: dbRow.published_at,
			updated: dbRow.updated_at,
			category,
			// 저장 시 미리 렌더된 HTML 사용 — 매 요청 markdown+highlight 재컴파일 방지
			content: dbRow.content_html || renderMarkdownToHtml(dbRow.content_md),
			wordCount: dbRow.word_count as number,
			viewCount,
			tags,
			comments,
			postLikeCount: postLike.count,
			postLikedByViewer: postLike.liked,
			commentLikesById,
			postFolderId: isAdmin ? (hostFolder?.id ?? null) : null,
			folderMoveTargets: isAdmin ? folderMovePickerEntries(allFolders) : [],
			seo: {
				title: dbRow.title,
				description: plainTextFromMarkdown(dbRow.content_md, 158) || SEO_DEFAULT_DESCRIPTION,
				canonicalPath: `/blog/${postId}`,
				type: 'article',
				publishedTime: dbRow.published_at ?? undefined,
				modifiedTime: dbRow.updated_at
			}
		};
	}

	/** /blog/f/{id}/ 폴더 목록 */
	if (segments[0] === 'f' && segments[1] && /^\d+$/.test(segments[1]) && segments.length === 2) {
		const folderId = Number(segments[1]);
		const [isAdmin, allFolders] = await Promise.all([isAdminPromise, foldersPromise]);
		return loadBlogFolderListing(locals.supabase, allFolders, folderId, pathParam, segments, {
			onlyPublished: !isAdmin,
			isAdmin,
			allPosts: Promise.resolve([] as ListPost[])
		});
	}

	/** /blog — 루트 폴더(id=0)의 `subfolders`·`posts` */
	if (segments.length === 0) {
		const [isAdmin, allFolders, publishedRows] = await Promise.all([
			isAdminPromise,
			foldersPromise,
			listPublishedPosts(locals.supabase)
		]);
		const allPosts = Promise.resolve(
			[...publishedRows].sort(comparePostsByPostedDateDesc).map((r) => {
				const host = findFolderContainingPost(r.id, allFolders);
				const pathLabel = host ? folderPathLabelExcludingRoot(host.id, allFolders) : '';
				return postRowToCard(r, pathLabel);
			})
		);
		return loadBlogFolderListing(
			locals.supabase,
			allFolders,
			BLOG_ROOT_FOLDER_ID,
			pathParam,
			segments,
			{
				onlyPublished: !isAdmin,
				isAdmin,
				allPosts,
				preloadedPublishedRows: publishedRows
			}
		);
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

	deleteComment: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('comment_id'));
		const postSlug = String(form.get('post_slug') ?? '').trim();

		if (!Number.isFinite(id) || id <= 0 || !postSlug) {
			return fail(400, { message: '잘못된 요청입니다.' });
		}

		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { message: '로그인이 필요합니다.' });

		const { data: row, error: selErr } = await locals.supabase
			.from('comments')
			.select('id, author_id, post_slug')
			.eq('id', id)
			.maybeSingle();

		if (selErr) return fail(400, { message: selErr.message });
		if (!row || row.post_slug !== postSlug) {
			return fail(404, { message: '댓글을 찾을 수 없습니다.' });
		}
		if (row.author_id !== user.id) {
			return fail(403, { message: '삭제할 권한이 없습니다.' });
		}

		const { data: deleted, error: delErr } = await locals.supabase
			.from('comments')
			.delete()
			.eq('id', id)
			.select('id');

		if (delErr) return fail(400, { message: delErr.message });
		if (!deleted?.length) return fail(403, { message: '삭제할 수 없습니다.' });

		return { ok: true };
	},

	togglePostLike: async ({ request, locals, getClientAddress }) => {
		const service = tryCreateSupabaseServiceClient();
		const rateSecret = privateEnv.COMMENT_RATE_LIMIT_SECRET ?? privateEnv.SUPABASE_SECRET_KEY ?? '';
		if (!service || !rateSecret) {
			return fail(503, {
				message:
					'좋아요를 처리할 수 없습니다. 서버에 SUPABASE_SECRET_KEY(및 선택적으로 COMMENT_RATE_LIMIT_SECRET)를 설정했는지 확인하세요.'
			});
		}

		const form = await request.formData();
		const postId = Number(form.get('post_id'));
		if (!Number.isFinite(postId) || postId <= 0) {
			return fail(400, { message: '잘못된 요청입니다.' });
		}

		const ip = getClientAddress() ?? 'unknown';
		const ipHash = hashCommentClientIp(rateSecret, ip);

		const gate = await gateLikeAction(service, ipHash);
		if (!gate.ok) return fail(429, { message: gate.message });

		const { data: postRow } = await service
			.from('posts')
			.select('id, published')
			.eq('id', postId)
			.maybeSingle();
		if (!postRow) return fail(404, { message: '글을 찾을 수 없습니다.' });

		if (!postRow.published) {
			const {
				data: { user: u0 }
			} = await locals.supabase.auth.getUser();
			if (!u0) return fail(404, { message: '글을 찾을 수 없습니다.' });
			const { data: profile0 } = await locals.supabase
				.from('profiles')
				.select('role')
				.eq('id', u0.id)
				.maybeSingle();
			if (profile0?.role !== 'admin') return fail(404, { message: '글을 찾을 수 없습니다.' });
		}

		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (user) {
			const { data: existing } = await service
				.from('post_likes')
				.select('id')
				.eq('post_id', postId)
				.eq('user_id', user.id)
				.maybeSingle();
			if (existing) {
				const { error: delErr } = await service.from('post_likes').delete().eq('id', existing.id);
				if (delErr) return fail(400, { message: delErr.message });
			} else {
				const { error: insErr } = await service.from('post_likes').insert({
					post_id: postId,
					user_id: user.id,
					ip_hash: null
				});
				if (insErr) return fail(400, { message: insErr.message });
			}
		} else {
			const { data: existing } = await service
				.from('post_likes')
				.select('id')
				.eq('post_id', postId)
				.is('user_id', null)
				.eq('ip_hash', ipHash)
				.maybeSingle();
			if (existing) {
				const { error: delErr } = await service.from('post_likes').delete().eq('id', existing.id);
				if (delErr) return fail(400, { message: delErr.message });
			} else {
				const { error: insErr } = await service.from('post_likes').insert({
					post_id: postId,
					user_id: null,
					ip_hash: ipHash
				});
				if (insErr) return fail(400, { message: insErr.message });
			}
		}

		const recorded = await recordLikeActionAttempt(service, ipHash);
		if (!recorded.ok)
			return fail(503, { message: '좋아요 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' });

		return { ok: true };
	},

	toggleCommentLike: async ({ request, locals, getClientAddress }) => {
		const service = tryCreateSupabaseServiceClient();
		const rateSecret = privateEnv.COMMENT_RATE_LIMIT_SECRET ?? privateEnv.SUPABASE_SECRET_KEY ?? '';
		if (!service || !rateSecret) {
			return fail(503, {
				message:
					'좋아요를 처리할 수 없습니다. 서버에 SUPABASE_SECRET_KEY(및 선택적으로 COMMENT_RATE_LIMIT_SECRET)를 설정했는지 확인하세요.'
			});
		}

		const form = await request.formData();
		const commentId = Number(form.get('comment_id'));
		const postSlug = String(form.get('post_slug') ?? '').trim();
		if (!Number.isFinite(commentId) || !postSlug) {
			return fail(400, { message: '잘못된 요청입니다.' });
		}

		const ip = getClientAddress() ?? 'unknown';
		const ipHash = hashCommentClientIp(rateSecret, ip);

		const gate = await gateLikeAction(service, ipHash);
		if (!gate.ok) return fail(429, { message: gate.message });

		const { data: commentRow } = await service
			.from('comments')
			.select('id, post_slug')
			.eq('id', commentId)
			.maybeSingle();
		if (!commentRow || commentRow.post_slug !== postSlug) {
			return fail(404, { message: '댓글을 찾을 수 없습니다.' });
		}

		const postId = Number(postSlug);
		if (!Number.isFinite(postId) || postId <= 0) {
			return fail(400, { message: '잘못된 요청입니다.' });
		}

		const { data: postRow } = await service
			.from('posts')
			.select('id, published')
			.eq('id', postId)
			.maybeSingle();
		if (!postRow) return fail(404, { message: '글을 찾을 수 없습니다.' });

		if (!postRow.published) {
			const {
				data: { user: u0 }
			} = await locals.supabase.auth.getUser();
			if (!u0) return fail(404, { message: '글을 찾을 수 없습니다.' });
			const { data: profile0 } = await locals.supabase
				.from('profiles')
				.select('role')
				.eq('id', u0.id)
				.maybeSingle();
			if (profile0?.role !== 'admin') return fail(404, { message: '글을 찾을 수 없습니다.' });
		}

		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (user) {
			const { data: existing } = await service
				.from('comment_likes')
				.select('id')
				.eq('comment_id', commentId)
				.eq('user_id', user.id)
				.maybeSingle();
			if (existing) {
				const { error: delErr } = await service
					.from('comment_likes')
					.delete()
					.eq('id', existing.id);
				if (delErr) return fail(400, { message: delErr.message });
			} else {
				const { error: insErr } = await service.from('comment_likes').insert({
					comment_id: commentId,
					user_id: user.id,
					ip_hash: null
				});
				if (insErr) return fail(400, { message: insErr.message });
			}
		} else {
			const { data: existing } = await service
				.from('comment_likes')
				.select('id')
				.eq('comment_id', commentId)
				.is('user_id', null)
				.eq('ip_hash', ipHash)
				.maybeSingle();
			if (existing) {
				const { error: delErr } = await service
					.from('comment_likes')
					.delete()
					.eq('id', existing.id);
				if (delErr) return fail(400, { message: delErr.message });
			} else {
				const { error: insErr } = await service.from('comment_likes').insert({
					comment_id: commentId,
					user_id: null,
					ip_hash: ipHash
				});
				if (insErr) return fail(400, { message: insErr.message });
			}
		}

		const recorded = await recordLikeActionAttempt(service, ipHash);
		if (!recorded.ok)
			return fail(503, { message: '좋아요 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' });

		return { ok: true };
	},

	movePost: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { message: '로그인이 필요합니다.' });

		const { data: profileRow } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.maybeSingle();
		if (profileRow?.role !== 'admin') return fail(403, { message: '권한이 없습니다.' });

		const form = await request.formData();
		const idRaw = String(form.get('post_id') ?? '').trim();
		const postId = Number(idRaw);
		if (!Number.isFinite(postId) || postId <= 0) {
			return fail(400, { message: '잘못된 글입니다.' });
		}

		const targetRaw = String(form.get('target_folder_id') ?? '').trim();
		const targetFolderId = targetRaw === '' ? BLOG_ROOT_FOLDER_ID : Number(targetRaw);
		if (!Number.isFinite(targetFolderId) || targetFolderId < BLOG_ROOT_FOLDER_ID) {
			return fail(400, { message: '잘못된 폴더입니다.' });
		}

		const dbRow = await getPostById(locals.supabase, postId);
		if (!dbRow) return fail(404, { message: '글을 찾을 수 없습니다.' });

		const allFoldersForMove = await fetchAllFolders(locals.supabase);
		if (!foldersById(allFoldersForMove).has(targetFolderId)) {
			return fail(400, { message: '대상 폴더를 찾을 수 없습니다.' });
		}

		try {
			await movePostToFolder(locals.supabase, postId, targetFolderId);
			throw redirect(
				303,
				resolve('/blog/[...path]', {
					path: String(postId)
				})
			);
		} catch (e) {
			if (isRedirect(e)) throw e;
			console.error('[movePost]', e);
			return fail(400, {
				message: thrownMessageForActionFail(e, '글을 옮기지 못했습니다.')
			});
		}
	},

	createFolder: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { message: '로그인이 필요합니다.' });

		const { data: profileRow } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.maybeSingle();
		if (profileRow?.role !== 'admin') return fail(403, { message: '권한이 없습니다.' });

		const form = await request.formData();
		const nameRaw = String(form.get('name') ?? '');
		const parentRaw = String(form.get('parent_folder_id') ?? '').trim();
		const parentFolderId = parentRaw === '' ? null : Number(parentRaw);

		if (
			parentFolderId !== null &&
			(!Number.isFinite(parentFolderId) || parentFolderId < BLOG_ROOT_FOLDER_ID)
		) {
			return fail(400, { message: '잘못된 부모 폴더입니다.' });
		}

		const allFolders = await fetchAllFolders(locals.supabase);
		const byId = foldersById(allFolders);
		if (parentFolderId != null && !byId.has(parentFolderId)) {
			return fail(400, { message: '부모 폴더를 찾을 수 없습니다.' });
		}

		try {
			await createFolderUnderParent(locals.supabase, parentFolderId, nameRaw);
			return { ok: true };
		} catch (e) {
			console.error('[createFolder]', e);
			return fail(400, {
				message: thrownMessageForActionFail(e, '폴더를 만들 수 없습니다.')
			});
		}
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

		throw redirect(303, '/blog');
	}
};
