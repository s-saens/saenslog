<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { hrefBlogPath } from '$lib/appPaths';
	import { browser } from '$app/environment';
	import AdminBlogPreviewOverlay from '$lib/components/AdminBlogPreviewOverlay.svelte';
	import AdminMarkdownField from '$lib/components/AdminMarkdownField.svelte';
	import { renderMarkdownToHtml } from '$lib/markdownCompile';

	let { data, form } = $props();

	let slugVal = $state('');
	let titleVal = $state('');
	let md = $state('');
	let published = $state(false);
	let previewOpen = $state(false);
	let saving = $state(false);
	let autosaveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	// 자동 저장 타이머
	let autosaveTimer: ReturnType<typeof setTimeout> | undefined;

	// 자동 저장 함수
	async function autosave() {
		if (!browser) return;
		autosaveStatus = 'saving';
		try {
			const fd = new FormData();
			fd.set('slug', slugVal);
			fd.set('title', titleVal);
			fd.set('content_md', md);
			fd.set('published', published ? 'true' : 'false');
			const res = await fetch('?/autosave', {
				method: 'POST',
				body: fd
			});
			if (res.ok) {
				autosaveStatus = 'saved';
				setTimeout(() => {
					if (autosaveStatus === 'saved') autosaveStatus = 'idle';
				}, 2000);
			} else {
				autosaveStatus = 'error';
			}
		} catch {
			autosaveStatus = 'error';
		}
	}

	// 10초마다 자동 저장
	$effect(() => {
		if (!browser) return;
		autosaveTimer = setInterval(autosave, 10000);
		return () => clearInterval(autosaveTimer);
	});

	// Ctrl/Cmd+S 단축키 처리
	$effect(() => {
		if (!browser) return;
		function handleKeydown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault();
				void autosave();
			}
		}
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	let html = $derived(renderMarkdownToHtml(md));
	let wordCount = $derived(md.trim() ? md.trim().split(/\s+/).filter(Boolean).length : 0);

	$effect.pre(() => {
		slugVal = data.post.slug;
		titleVal = data.post.title;
		md = data.post.content_md || '';
		published = data.post.published;
	});
</script>

<svelte:head>
	<title>{data.post.title} · 수정 | SAENS</title>
</svelte:head>

<AdminBlogPreviewOverlay
	bind:open={previewOpen}
	title={titleVal}
	slug={slugVal}
	{html}
	{wordCount}
/>

<main class="editor-page">
	<h1>글 수정</h1>
	<p class="slug-line">
		<a class="blog-link" href={hrefBlogPath(slugVal)}>블로그에서 보기 →</a>
	</p>
	<p class="hint">
		슬러그를 바꾸면 URL 경로가 바뀝니다. 저장 후 댓글은 새 경로에 그대로 이어집니다.
	</p>

	{#if form?.message}
		<p class="err" role="alert">{form.message}</p>
	{/if}
	{#if form?.success}
		<p class="success" role="status">저장되었습니다.</p>
	{/if}

	<form
		class="form"
		method="POST"
		action="?/save"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
	>
		<div class="grid">
			<label class="field full">
				<span class="label">슬러그 (URL 경로, 예: Dev/AI/3)</span>
				<input class="input mono" name="slug" required bind:value={slugVal} autocomplete="off" />
			</label>
			<label class="field full">
				<span class="label">제목</span>
				<input class="input" name="title" required bind:value={titleVal} />
			</label>
		</div>

		<label class="check">
			<input type="checkbox" name="published" value="true" bind:checked={published} />
			<span>공개</span>
		</label>

		<AdminMarkdownField bind:md docSyncKey={`fs-${slugVal}`} getAssetSlug={() => slugVal} />

		<div class="toolbar">
			<span class="autosave-status">
				{#if autosaveStatus === 'saving'}
					저장 중...
				{:else if autosaveStatus === 'saved'}
					저장됨
				{:else if autosaveStatus === 'error'}
					저장 실패
				{:else}
					자동 저장 활성화
				{/if}
			</span>
			<button type="button" class="btn" onclick={() => (previewOpen = true)}>미리보기</button>
			<button type="submit" class="btn primary" disabled={saving}>
				{saving ? '저장 중...' : '저장'}
			</button>
			<a class="btn" href={resolve('/admin/posts')}>목록</a>
			<button type="submit" class="btn danger" form="post-delete-form">삭제</button>
		</div>
	</form>

	<form
		id="post-delete-form"
		class="visually-hidden"
		method="POST"
		action="?/delete"
		use:enhance
		onsubmit={(e) => {
			if (!confirm('이 글을 삭제할까요?')) {
				e.preventDefault();
			}
		}}
	></form>
</main>

<style>
	.editor-page {
		padding: calc(var(--site-header-height) + 1.25rem) 1.25rem 2.5rem;
		max-width: 56rem;
		margin: 0 auto;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.35rem;
		font-weight: 600;
		color: var(--text);
	}

	.hint {
		margin: 0 0 1.25rem;
		font-size: 0.8rem;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.slug-line {
		margin: 0 0 1.25rem;
		font-size: 0.82rem;
		color: var(--text-tertiary);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.blog-link {
		color: var(--text-secondary);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.blog-link:hover {
		color: var(--text);
	}

	.err {
		color: #f87171;
		font-size: 0.88rem;
		margin: 0 0 1rem;
	}

	.success {
		color: #4ade80;
		font-size: 0.88rem;
		margin: 0 0 1rem;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.grid {
		display: grid;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field.full {
		grid-column: 1 / -1;
	}

	.label {
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	.input {
		font: inherit;
		font-size: 0.88rem;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
	}

	.input.mono {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.82rem;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.88rem;
		color: var(--text-secondary);
	}

	.autosave-status {
		font-size: 0.78rem;
		color: var(--text-tertiary);
		padding: 0 0.25rem;
	}

	.toolbar {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.15rem;
	}

	.toolbar .btn {
		flex: 0 0 auto;
		white-space: nowrap;
	}

	.btn {
		font: inherit;
		font-size: 0.88rem;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.btn.primary {
		background: var(--accent);
		color: var(--bg);
		border-color: var(--accent);
	}

	.btn.primary:hover {
		opacity: 0.92;
	}

	.btn.danger {
		border-color: color-mix(in srgb, #f87171 55%, var(--border));
		color: #f87171;
	}

	.btn.danger:hover {
		background: color-mix(in srgb, #f87171 12%, transparent);
	}

	.visually-hidden {
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
