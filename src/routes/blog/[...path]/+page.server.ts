import { resolve } from '$app/paths';
import { env as privateEnv } from '$env/dynamic/private';
import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import { deleteBlogAssetFolder } from '$lib/server/blogPostAssets';
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
	fetchAllFoldersCached,
	invalidateFoldersCache,
	findFolderContainingPost,
	folderDisplayLabel,
	folderMovePickerEntries,
	foldersById,
	movePostToFolder,
	removePostFromAllFolders,
	type FolderRow
} from '$lib/server/folders';
import { deletePostById, getPostById, type PostFullRow } from '$lib/server/posts';
import {
	blogIndexKey,
	invalidateEdgeCache,
	listingShellKey,
	postShellKey,
	readEdgeCache,
	writeEdgeCache
} from '$lib/server/edgeCache';
import { thrownMessageForActionFail } from '$lib/formActionFailure';
import { plainTextFromMarkdown, SEO_DEFAULT_DESCRIPTION } from '$lib/seo';
import { renderMarkdownToHtml } from '$lib/server/markdown';
import { tryCreateSupabaseServiceClient } from '$lib/server/supabaseService';
import type { Actions, PageServerLoad } from './$types';

function folderListingBreadcrumbItems(
	chainExcludingRoot: FolderRow[]
): { label: string; path: string }[] {
	return chainExcludingRoot.map((f) => ({
		label: folderDisplayLabel(f),
		path: `/blog/f/${f.id}`
	}));
}

/** 글 상세의 "정적 셸" — 방문자/시간 비의존 데이터만. 엣지 캐시에 그대로 직렬화된다. */
type PostShell = {
	title: string;
	date: string;
	/** published_at (표시용) — boolean published와 무관 */
	published: string | null;
	updated: string;
	category: string;
	content: string;
	wordCount: number;
	/** 캐시 시점 스냅샷(최대 TTL만큼 지연; #4에서 이미 근사값 허용) */
	viewCount: number;
	tags: string[];
	breadcrumb: { label: string; path: string }[];
	seo: {
		title: string;
		description: string;
		canonicalPath: string;
		type: string;
		publishedTime: string | undefined;
		modifiedTime: string;
	};
};

/** dbRow + 폴더 트리로 정적 셸을 만든다(브레드크럼·태그·카테고리·SEO 포함). */
function buildPostShell(postId: number, dbRow: PostFullRow, allFolders: FolderRow[]): PostShell {
	const hostFolder = findFolderContainingPost(postId, allFolders);
	const chain = hostFolder
		? ancestorFolderChain(hostFolder.id, allFolders).filter((f) => f.id !== BLOG_ROOT_FOLDER_ID)
		: [];
	const breadcrumb = [{ label: 'Blog', path: '/blog' }, ...folderListingBreadcrumbItems(chain)];
	const tags = chain.map((f) => folderDisplayLabel(f));
	const category =
		chain.length > 1
			? chain
					.map((f) => folderDisplayLabel(f))
					.slice(0, -1)
					.join('/')
			: '';

	return {
		title: dbRow.title,
		date: dbRow.published_at ?? dbRow.updated_at,
		published: dbRow.published_at,
		updated: dbRow.updated_at,
		category,
		// 저장 시 미리 렌더된 HTML 사용 — 매 요청 markdown+highlight 재컴파일 방지
		content: dbRow.content_html || renderMarkdownToHtml(dbRow.content_md),
		wordCount: dbRow.word_count as number,
		viewCount: Number(dbRow.view_count ?? 0),
		tags,
		breadcrumb,
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

export const load: PageServerLoad = async ({ params, locals, platform }) => {
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
	// 방문자는 KV 캐시, admin은 라이브 DB(폴더 변경 즉시 반영). isAdminPromise는 위에서
	// 이미 병렬로 시작했고 비로그인은 즉시 false라 추가 지연이 거의 없다.
	const foldersPromise = fetchAllFoldersCached(locals.supabase, isAdminPromise);
	// 캐시 히트 분기에선 foldersPromise를 await하지 않을 수 있다 — 미처리 거부 경고 방지.
	// (소비처의 await는 여전히 원본의 거부를 전달받는다.)
	void foldersPromise.catch(() => {});

	/** 단일 세그먼트 숫자 → 글 */
	if (segments.length === 1 && /^\d+$/.test(segments[0])) {
		const postId = Number(segments[0]);

		// 댓글·좋아요는 SSR 크리티컬 패스에서 분리 — 클라이언트가 마운트 후
		// /api/posts/[id]/comments·likes 로 가져온다(island). load는 정적 셸만 반환.
		const waitUntil = platform?.context?.waitUntil?.bind(platform.context);
		const isAdmin = await isAdminPromise;

		// 정적 셸: 방문자는 엣지 캐시 우선, admin은 캐시 우회(라이브 DB로 편집 즉시 반영).
		let shell = isAdmin ? null : await readEdgeCache<PostShell>(postShellKey(postId));
		let isPublished = shell !== null; // 캐시엔 공개 글만 저장됨
		let adminHostFolderId: number | null = null;
		let adminFolderTargets: ReturnType<typeof folderMovePickerEntries> = [];

		if (!shell) {
			// 미스(또는 admin): 글·폴더 트리를 라이브로 읽어 셸을 만든다.
			const [allFolders, dbRow] = await Promise.all([
				foldersPromise,
				getPostById(locals.supabase, postId)
			]);
			if (!dbRow || (!isAdmin && !dbRow.published)) {
				error(404, '글을 찾을 수 없습니다.');
			}
			isPublished = dbRow.published;
			shell = buildPostShell(postId, dbRow, allFolders);
			if (isAdmin) {
				const hostFolder = findFolderContainingPost(postId, allFolders);
				adminHostFolderId = hostFolder?.id ?? null;
				adminFolderTargets = folderMovePickerEntries(allFolders);
			} else if (dbRow.published) {
				// 공개 글만 캐시(비공개는 admin 전용 경로라 여기 도달하지 않음)
				await writeEdgeCache(postShellKey(postId), shell, { waitUntil });
			}
		}

		// 조회수 증가는 critical path에서 분리(#4) — 공개 글에 한해 백그라운드로만 실행.
		// 표시값(shell.viewCount)은 캐시 시점 스냅샷이라 최대 TTL만큼 지연될 수 있다.
		if (isPublished) {
			const increment = (async () => {
				const { error: rpcErr } = await locals.supabase.rpc('increment_post_view', {
					post_id: postId
				});
				if (rpcErr) console.warn('[increment_post_view]', rpcErr.message);
			})();
			if (waitUntil) waitUntil(increment);
			else void increment.catch(() => {});
		}

		return {
			path: String(postId),
			pathParam,
			segments,
			breadcrumb: shell.breadcrumb,
			isPost: true as const,
			isAdmin,
			postId,
			title: shell.title,
			date: shell.date,
			published: shell.published,
			updated: shell.updated,
			category: shell.category,
			content: shell.content,
			wordCount: shell.wordCount,
			viewCount: shell.viewCount,
			tags: shell.tags,
			postFolderId: adminHostFolderId,
			folderMoveTargets: adminFolderTargets,
			seo: shell.seo
		};
	}

	// 리스팅(/blog, /blog/f/{id})은 유니버설 +page.ts가 메모리 인덱스(/api/blog-index)에서
	// 직접 만든다. 서버는 DB 작업 없이 최소값만 반환 — 클라이언트 이동 시 목록 재조회를 없앤다.
	// (SSR HTML도 유니버설 load가 생성하므로 SEO에는 영향 없음.)
	if (
		segments.length === 0 ||
		(segments[0] === 'f' && segments.length === 2 && /^\d+$/.test(segments[1]))
	) {
		return { isPost: false as const };
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
			await invalidateFoldersCache();
			// 글의 브레드크럼·태그·카테고리가 바뀌므로 셸 + 루트/대상 폴더 리스팅 + 인덱스 무효화
			await invalidateEdgeCache(postShellKey(postId));
			await invalidateEdgeCache(listingShellKey('root'));
			await invalidateEdgeCache(listingShellKey(targetFolderId));
			await invalidateEdgeCache(blogIndexKey());
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
			await invalidateFoldersCache();
			// 새 하위 폴더가 부모/루트 리스팅 + 인덱스에 나타나야 함
			await invalidateEdgeCache(listingShellKey(parentFolderId ?? 'root'));
			await invalidateEdgeCache(listingShellKey('root'));
			await invalidateEdgeCache(blogIndexKey());
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
		const hostFolder = findFolderContainingPost(postId, folders);
		await removePostFromAllFolders(locals.supabase, folders, postId);
		await deletePostById(locals.supabase, postId);
		await invalidateFoldersCache();
		// 삭제된 글의 셸 + 루트/소속 폴더 리스팅 + 인덱스 무효화
		await invalidateEdgeCache(postShellKey(postId));
		await invalidateEdgeCache(listingShellKey('root'));
		if (hostFolder) await invalidateEdgeCache(listingShellKey(hostFolder.id));
		await invalidateEdgeCache(blogIndexKey());

		try {
			await deleteBlogAssetFolder(String(postId));
		} catch {
			/* 미디어 폴더 없음 등 */
		}

		throw redirect(303, '/blog');
	}
};
