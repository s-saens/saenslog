<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { hrefBlogPost } from '$lib/appPaths';
	import { browser } from '$app/environment';
	import AdminBlogPreviewOverlay from '$lib/components/AdminBlogPreviewOverlay.svelte';
	import AdminMarkdownField from '$lib/components/AdminMarkdownField.svelte';
	import { renderMarkdownToHtml } from '$lib/markdownCompile';

	let { data, form } = $props();

	let assetKey = $state('');
	let titleVal = $state('');
	let md = $state('');
	let published = $state(false);
	let previewOpen = $state(false);
	let saving = $state(false);
	let autosaveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	let autosaveTimer: ReturnType<typeof setTimeout> | undefined;

	async function autosave() {
		if (!browser) return;
		autosaveStatus = 'saving';
		try {
			const fd = new FormData();
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

	$effect(() => {
		if (!browser) return;
		autosaveTimer = setInterval(autosave, 10000);
		return () => clearInterval(autosaveTimer);
	});

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
		assetKey = String(data.post.id);
		titleVal = data.post.title;
		md = data.post.content_md || '';
		published = data.post.published;
	});
</script>

<AdminBlogPreviewOverlay
	bind:open={previewOpen}
	title={titleVal}
	slug={assetKey}
	{html}
	{wordCount}
/>

<main class="editor-page">
	<h1>글 수정</h1>
	<p class="slug-line">
		<span class="id-label">글 id · 미디어 경로</span>
		<code class="id-code">{assetKey}</code>
		<a class="blog-link" href={hrefBlogPost(assetKey)}>블로그에서 보기 →</a>
	</p>
	<p class="hint">
		공개 주소는 <code class="inline">/blog/{assetKey}</code> 입니다. 목록 카드 보조 줄에는 폴더 이름이
		표시됩니다. 본문 미디어는
		<code class="inline">static/blog/{assetKey}/</code>에 저장됩니다.
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
				<span class="label">제목</span>
				<input class="input" name="title" required bind:value={titleVal} />
			</label>
		</div>

		<label class="check">
			<input type="checkbox" name="published" value="true" bind:checked={published} />
			<span>공개</span>
		</label>

		<AdminMarkdownField bind:md docSyncKey={`db-${assetKey}`} getAssetSlug={() => assetKey} />

		<div class="toolbar">
			<button type="button" class="btn" onclick={() => (previewOpen = true)}>미리보기</button>
			<button type="submit" class="btn primary" disabled={saving}>
				{saving ? '저장 중...' : '저장'}
			</button>
			<a class="btn" href={resolve('/admin/posts')}>목록</a>
			<button type="submit" class="btn danger" form="post-delete-form">삭제</button>
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

	.inline {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.85em;
	}

	.slug-line {
		margin: 0 0 0.75rem;
		font-size: 0.82rem;
		color: var(--text-tertiary);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.id-label {
		color: var(--text-secondary);
	}

	.id-code {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.85rem;
		padding: 0.15rem 0.45rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--text) 7%, transparent);
		border: 1px solid var(--border);
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
		margin-left: auto;
		flex-shrink: 0;
		white-space: nowrap;
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
