<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import HeartIcon from '$lib/components/icons/HeartIcon.svelte';

	let {
		postId
	}: {
		postId: number;
	} = $props();

	// 좋아요는 본문 SSR을 막지 않도록 마운트 후 island fetch로 채운다.
	let count = $state(0);
	let liked = $state(false);
	let loaded = $state(false);

	async function refresh() {
		try {
			const res = await fetch(`/api/posts/${postId}/likes`, { headers: { accept: 'application/json' } });
			if (!res.ok) return;
			const data = (await res.json()) as { count: number; liked: boolean };
			count = data.count ?? 0;
			liked = !!data.liked;
			loaded = true;
		} catch {
			// 네트워크 실패 시 조용히 무시 — 다음 상호작용에서 재시도
		}
	}

	onMount(refresh);

	function afterToggle() {
		return async ({
			result
		}: {
			result: { type: string; data?: { message?: string } };
		}) => {
			if (result.type === 'failure') {
				const msg = result.data?.message;
				if (msg) alert(msg);
			}
			await refresh();
		};
	}
</script>

<div class="post-likes">
	<form method="POST" action="?/togglePostLike" use:enhance={afterToggle}>
		<input type="hidden" name="post_id" value={String(postId)} />
		<button
			type="submit"
			class="heart-btn"
			class:active={liked}
			class:loading={!loaded}
			aria-pressed={liked}
			aria-label={liked ? '이 글 좋아요 취소' : '이 글 좋아요'}
		>
			<HeartIcon filled={liked} width={22} height={22} class="heart-ic" />
			<span class="count">{count.toLocaleString('ko-KR')}</span>
		</button>
	</form>
</div>

<style>
	.post-likes {
		margin: 1.75rem 0 0.25rem;
		padding-top: 1.25rem;
	}

	.heart-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font: inherit;
		cursor: pointer;
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.35rem 0.85rem 0.35rem 0.65rem;
		background: var(--bg);
		color: var(--text-secondary);
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			background 0.15s ease;
	}

	.heart-btn.loading {
		opacity: 0.55;
	}

	.heart-btn:hover {
		border-color: color-mix(in srgb, #f472b6 35%, var(--border));
		color: var(--text);
	}

	.heart-btn.active {
		border-color: color-mix(in srgb, #f472b6 55%, var(--border));
		color: #f472b6;
		background: color-mix(in srgb, #f472b6 12%, var(--bg));
	}

	:global(.heart-ic) {
		display: block;
		flex-shrink: 0;
	}

	.count {
		font-size: 0.88rem;
		font-weight: 600;
		color: inherit;
	}
</style>
