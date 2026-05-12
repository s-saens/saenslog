<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminBlogPreviewOverlay from '$lib/components/AdminBlogPreviewOverlay.svelte';
	import AdminMarkdownField from '$lib/components/AdminMarkdownField.svelte';
	import { renderMarkdownToHtml } from '$lib/markdownCompile';

	let { data, form } = $props();

	let titleVal = $state('');
	let md = $state('');
	let previewOpen = $state(false);

	let html = $derived(renderMarkdownToHtml(md));
	let wordCount = $derived(md.trim() ? md.trim().split(/\s+/).filter(Boolean).length : 0);
</script>

<AdminBlogPreviewOverlay
	bind:open={previewOpen}
	title={titleVal || '제목 없음'}
	slug="draft/preview"
	{html}
	{wordCount}
/>

<main class="editor-page">
	<h1>새 글</h1>
	<p class="hint">
		저장하면 Supabase에 글이 생성되고 숫자 id가 부여됩니다. 그 후 같은 화면에서 미디어 붙여넣기가
		<code class="inline">static/blog/&lt;id&gt;/</code>로 연결됩니다.
	</p>

	{#if form?.message}
		<p class="err" role="alert">{form.message}</p>
	{/if}

	<form class="form" method="POST" action="?/save" use:enhance>
		{#if data.folderId != null}
			<input type="hidden" name="folder_id" value={String(data.folderId)} />
		{/if}
		<div class="grid">
			<label class="field full">
				<span class="label">제목</span>
				<input class="input" name="title" required bind:value={titleVal} />
			</label>
		</div>

		<label class="check">
			<input type="checkbox" name="published" value="true" />
			<span>바로 공개</span>
		</label>

		<AdminMarkdownField bind:md docSyncKey="new-draft" getAssetSlug={() => ''} />

		<div class="toolbar">
			<button type="button" class="btn" onclick={() => (previewOpen = true)}>미리보기</button>
			<button type="submit" class="btn primary">저장</button>
		</div>
	</form>
</main>

<style>
	.editor-page {
		padding: calc(var(--site-header-height) + 1.25rem) 1.25rem 2.5rem;
		max-width: 56rem;
		margin: 0 auto;
	}

	h1 {
		margin: 0 0 1.25rem;
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

	.err {
		color: #f87171;
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

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
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
</style>
