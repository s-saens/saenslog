<script lang="ts">
	import { resolve } from '$app/paths';
	import { hrefAdminPostEdit } from '$lib/appPaths';

	let { data } = $props();
</script>

<svelte:head>
	<title>글 목록 | 관리 | SAENS</title>
</svelte:head>

<main class="posts-admin">
	<header class="head">
		<h1>블로그 글</h1>
		<a class="btn primary" href={resolve('/admin/posts/new')}>새 글</a>
	</header>

	{#if data.posts.length === 0}
		<p class="empty">
			아직 DB에 글이 없습니다. 새 글을 작성하거나 마크다운 파일만 사용 중일 수 있습니다.
		</p>
	{:else}
		<ul class="list">
			{#each data.posts as p (p.id)}
				<li class="row">
					<a class="title" href={hrefAdminPostEdit(p.slug)}>{p.title}</a>
					<span class="meta">
						<span class="slug">{p.slug}</span>
						<span class="pill" class:pub={p.published} class:draft={!p.published}>
							{p.published ? '공개' : '초안'}
						</span>
						<time datetime={p.updated_at}>{p.updated_at.slice(0, 10)}</time>
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="back">
		<a href={resolve('/admin')}>← 관리 홈</a>
	</p>
</main>

<style>
	.posts-admin {
		padding: calc(var(--site-header-height) + 1.25rem) 1.25rem 2.5rem;
		max-width: 44rem;
		margin: 0 auto;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	h1 {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 600;
		color: var(--text);
	}

	.btn {
		font: inherit;
		font-size: 0.88rem;
		padding: 0.45rem 0.9rem;
		border-radius: 8px;
		text-decoration: none;
		border: 1px solid var(--border);
		color: var(--text-secondary);
	}

	.btn.primary {
		background: var(--accent);
		color: var(--bg);
		border-color: var(--accent);
	}

	.btn.primary:hover {
		opacity: 0.92;
	}

	.empty {
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: color-mix(in srgb, var(--bg-lighter) 88%, transparent);
	}

	.title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
		text-decoration: none;
	}

	.title:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.78rem;
		color: var(--text-tertiary);
	}

	.slug {
		font-family: var(--font-mono);
		word-break: break-all;
	}

	.pill {
		padding: 0.1rem 0.45rem;
		border-radius: 6px;
		border: 1px solid var(--border);
		font-size: 0.72rem;
	}

	.pill.pub {
		border-color: color-mix(in srgb, #4ade80 60%, var(--border));
		color: var(--text-secondary);
	}

	.pill.draft {
		border-color: color-mix(in srgb, #fbbf24 50%, var(--border));
		color: var(--text-secondary);
	}

	time {
		margin-left: auto;
	}

	.back {
		margin-top: 2rem;
		font-size: 0.85rem;
	}

	.back a {
		color: var(--text-secondary);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.back a:hover {
		color: var(--text);
	}
</style>
