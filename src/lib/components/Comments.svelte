<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	export type CommentItem = {
		id: number;
		content: string;
		author_id: string;
		parent_id: number | null;
		created_at: string;
		profiles: { username: string; avatar_url: string | null } | null;
	};

	let {
		postSlug,
		initialComments,
		currentUserId
	}: {
		postSlug: string;
		initialComments: CommentItem[];
		currentUserId: string | null;
	} = $props();

	let comments = $state<CommentItem[]>([...initialComments]);
	let replyToId = $state<number | null>(null);

	$effect(() => {
		comments = [...initialComments];
	});

	onMount(() => {
		if (!browser) return;

		const channel = supabase
			.channel(`comments:${postSlug}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'comments' },
				(payload) => {
					const row = (payload.new as { post_slug?: string } | null)?.post_slug;
					const oldRow = (payload.old as { post_slug?: string } | null)?.post_slug;
					if (row === postSlug || oldRow === postSlug) {
						void invalidateAll();
					}
				}
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	});

	function topLevel(): CommentItem[] {
		return comments.filter((c) => c.parent_id === null);
	}

	function repliesFor(parentId: number): CommentItem[] {
		return comments.filter((c) => c.parent_id === parentId);
	}

	function formatTime(iso: string) {
		const d = new Date(iso);
		return d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
	}
</script>

<div class="comments">
	<h2 class="h">댓글 {comments.length}</h2>

	{#if !currentUserId}
		<p class="login-hint">
			<a class="link" href="/login?next={encodeURIComponent($page.url.pathname)}"> 로그인하고 댓글 작성</a>
		</p>
	{:else}
		<form
			class="compose"
			method="POST"
			action="?/addComment"
			use:enhance={() =>
				async ({ update }) => {
					replyToId = null;
					await update();
				}}
		>
			<input type="hidden" name="post_slug" value={postSlug} />
			<input type="hidden" name="parent_id" value="" />
			<label class="sr-only" for="comment-root">댓글</label>
			<textarea
				id="comment-root"
				class="textarea"
				name="content"
				rows="3"
				placeholder="댓글을 입력하세요."
				required
			></textarea>
			<button type="submit" class="btn">등록</button>
		</form>
	{/if}

	<ul class="thread">
		{#each topLevel() as c (c.id)}
			<li class="item">
				<div class="meta">
					<span class="who">{c.profiles?.username ?? '사용자'}</span>
					<time datetime={c.created_at}>{formatTime(c.created_at)}</time>
				</div>
				<div class="body">{c.content}</div>

				{#if currentUserId === c.author_id}
					<details class="editbox">
						<summary>수정</summary>
						<form method="POST" action="?/editComment" use:enhance>
							<input type="hidden" name="comment_id" value={c.id} />
							<textarea class="textarea" name="content" rows="3" required>{c.content}</textarea>
							<button type="submit" class="btn small">저장</button>
						</form>
					</details>
					<form
						method="POST"
						action="?/deleteComment"
						use:enhance={({ cancel }) =>
							async () => {
								if (!confirm('이 댓글을 삭제할까요?')) cancel();
							}}
					>
						<input type="hidden" name="comment_id" value={c.id} />
						<button type="submit" class="btn danger ghost small">삭제</button>
					</form>
				{/if}

				{#if currentUserId && replyToId !== c.id}
					<button type="button" class="btn ghost small" onclick={() => (replyToId = replyToId === c.id ? null : c.id)}>
						답글
					</button>
				{/if}

				{#if replyToId === c.id && currentUserId}
					<form
						class="reply-form"
						method="POST"
						action="?/addComment"
						use:enhance={() =>
							async ({ update }) => {
								replyToId = null;
								await update();
							}}
					>
						<input type="hidden" name="post_slug" value={postSlug} />
						<input type="hidden" name="parent_id" value={c.id} />
						<textarea class="textarea" name="content" rows="2" placeholder="답글..." required></textarea>
						<div class="reply-actions">
							<button type="submit" class="btn small">답글 등록</button>
							<button type="button" class="btn ghost small" onclick={() => (replyToId = null)}>취소</button>
						</div>
					</form>
				{/if}

				{#if repliesFor(c.id).length > 0}
					<ul class="replies">
						{#each repliesFor(c.id) as r (r.id)}
							<li class="item reply">
								<div class="meta">
									<span class="who">{r.profiles?.username ?? '사용자'}</span>
									<time datetime={r.created_at}>{formatTime(r.created_at)}</time>
								</div>
								<div class="body">{r.content}</div>
								{#if currentUserId === r.author_id}
									<details class="editbox">
										<summary>수정</summary>
										<form method="POST" action="?/editComment" use:enhance>
											<input type="hidden" name="comment_id" value={r.id} />
											<textarea class="textarea" name="content" rows="2" required>{r.content}</textarea>
											<button type="submit" class="btn small">저장</button>
										</form>
									</details>
									<form
										method="POST"
										action="?/deleteComment"
										use:enhance={({ cancel }) =>
											async () => {
												if (!confirm('이 댓글을 삭제할까요?')) cancel();
											}}
									>
										<input type="hidden" name="comment_id" value={r.id} />
										<button type="submit" class="btn danger ghost small">삭제</button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.comments {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.h {
		margin: 0 0 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text);
	}

	.login-hint {
		margin: 0 0 1rem;
		font-size: 0.88rem;
		color: var(--text-secondary);
	}

	.link {
		color: var(--text-secondary);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.link:hover {
		color: var(--text);
	}

	.compose {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.textarea {
		font: inherit;
		font-size: 0.88rem;
		line-height: 1.45;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
		resize: vertical;
		width: 100%;
		box-sizing: border-box;
	}

	.btn {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.45rem 0.85rem;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--accent);
		color: var(--bg);
		cursor: pointer;
		align-self: flex-start;
	}

	.btn.small {
		font-size: 0.78rem;
		padding: 0.3rem 0.65rem;
	}

	.btn.ghost {
		background: transparent;
		color: var(--text-secondary);
	}

	.btn.danger {
		border-color: color-mix(in srgb, #f87171 45%, var(--border));
		color: #f87171;
	}

	.btn.danger.ghost {
		background: transparent;
	}

	.thread {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.item {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		align-items: flex-start;
	}

	.item.reply {
		font-size: 0.92em;
	}

	.meta {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 0.78rem;
		color: var(--text-tertiary);
	}

	.who {
		font-weight: 600;
		color: var(--text-secondary);
	}

	.body {
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--text);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.replies {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0.65rem 0 0 0.85rem;
		border-left: 2px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.reply-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.35rem;
	}

	.reply-actions {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.editbox {
		font-size: 0.82rem;
		color: var(--text-secondary);
		width: 100%;
	}

	.editbox summary {
		cursor: pointer;
		margin-bottom: 0.35rem;
	}

	.editbox form {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
