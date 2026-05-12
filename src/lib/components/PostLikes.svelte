<script lang="ts">
	import { enhance } from '$app/forms';
	import HeartIcon from '$lib/components/icons/HeartIcon.svelte';

	let {
		postId,
		initialCount,
		initialLiked
	}: {
		postId: number;
		initialCount: number;
		initialLiked: boolean;
	} = $props();

	function afterToggle() {
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: { message?: string } };
			update: () => Promise<void>;
		}) => {
			if (result.type === 'failure') {
				const msg = result.data?.message;
				if (msg) alert(msg);
			}
			await update();
		};
	}
</script>

<div class="post-likes">
	<form method="POST" action="?/togglePostLike" use:enhance={afterToggle}>
		<input type="hidden" name="post_id" value={String(postId)} />
		<button
			type="submit"
			class="heart-btn"
			class:active={initialLiked}
			aria-pressed={initialLiked}
			aria-label={initialLiked ? '이 글 좋아요 취소' : '이 글 좋아요'}
		>
			<HeartIcon filled={initialLiked} width={22} height={22} class="heart-ic" />
			<span class="count">{initialCount.toLocaleString('ko-KR')}</span>
		</button>
	</form>
</div>

<style>
	.post-likes {
		margin: 1.75rem 0 0.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border);
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
