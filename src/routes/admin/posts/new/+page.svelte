<script lang="ts">
	import { enhance } from '$app/forms';
	import { renderMarkdownToHtml } from '$lib/markdownCompile';

	let { form } = $props();

	let md = $state('');
	let html = $derived(renderMarkdownToHtml(md));
</script>

<svelte:head>
	<title>새 글 | 관리 | SAENS</title>
</svelte:head>

<main class="editor-page">
	<h1>새 글</h1>

	{#if form?.message}
		<p class="err" role="alert">{form.message}</p>
	{/if}

	<form class="form" method="POST" use:enhance>
		<div class="grid">
			<label class="field">
				<span class="label">슬러그 (URL 경로, 예: Dev/AI/3)</span>
				<input class="input" name="slug" required placeholder="Category/TitleSlug" autocomplete="off" />
			</label>
			<label class="field">
				<span class="label">제목</span>
				<input class="input" name="title" required />
			</label>
			<label class="field">
				<span class="label">카테고리 (선택)</span>
				<input class="input" name="category" placeholder="Dev/AI" autocomplete="off" />
			</label>
			<label class="field">
				<span class="label">태그 (쉼표 구분)</span>
				<input class="input" name="tags" placeholder="svelte, dev" autocomplete="off" />
			</label>
		</div>

		<label class="check">
			<input type="checkbox" name="published" value="true" />
			<span>바로 공개</span>
		</label>

		<div class="split">
			<label class="field grow">
				<span class="label">마크다운</span>
				<textarea
					class="textarea"
					name="content_md"
					rows="18"
					required
					bind:value={md}
				></textarea>
			</label>
			<div class="preview grow">
				<span class="label">미리보기</span>
				<div class="preview-inner content">{@html html}</div>
			</div>
		</div>

		<div class="actions">
			<button type="submit" class="btn primary">저장</button>
			<a class="btn" href="/admin/posts">취소</a>
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

	.field.grow {
		min-width: 0;
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

	.textarea {
		font: inherit;
		font-size: 0.82rem;
		line-height: 1.45;
		padding: 0.6rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
		resize: vertical;
		min-height: 12rem;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.88rem;
		color: var(--text-secondary);
	}

	.split {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 900px) {
		.split {
			grid-template-columns: 1fr 1fr;
			align-items: start;
		}
	}

	.preview-inner {
		min-height: 12rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: color-mix(in srgb, var(--bg-lighter) 85%, transparent);
		font-size: 0.88rem;
		line-height: 1.55;
		overflow: auto;
		max-height: 70vh;
	}

	.preview :global(.table-wrapper) {
		overflow-x: auto;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
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
