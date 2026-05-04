<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import AdminBlogPreviewOverlay from '$lib/components/AdminBlogPreviewOverlay.svelte';
	import AdminMarkdownField from '$lib/components/AdminMarkdownField.svelte';
	import { renderMarkdownToHtml } from '$lib/markdownCompile';

	let { data, form } = $props();

	function slugPrefixFromParent(parent: string | undefined) {
		const p = parent ?? '';
		return p ? `${p}/` : '';
	}

	let slugVal = $state('');
	let titleVal = $state('');
	let md = $state('');
	let previewOpen = $state(false);
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

	$effect.pre(() => {
		slugVal = slugPrefixFromParent(data.parentPrefix);
	});

	let html = $derived(renderMarkdownToHtml(md));
	let wordCount = $derived(md.trim() ? md.trim().split(/\s+/).filter(Boolean).length : 0);
</script>

<svelte:head>
	<title>새 글 | 관리 | SAENS</title>
</svelte:head>

<AdminBlogPreviewOverlay
	bind:open={previewOpen}
	title={titleVal}
	slug={slugVal || 'draft/preview'}
	{html}
	{wordCount}
/>

<main class="editor-page">
	<h1>새 글</h1>

	{#if form?.message}
		<p class="err" role="alert">{form.message}</p>
	{/if}

	<form class="form" method="POST" action="?/save" use:enhance>
		<div class="grid">
			<label class="field full">
				<span class="label">슬러그 (URL 경로, 예: Dev/AI/3 — 분류·경로는 슬러그로만 지정)</span>
				<input
					class="input"
					name="slug"
					required
					placeholder="Dev/AI/글슬러그"
					autocomplete="off"
					bind:value={slugVal}
				/>
			</label>
			<label class="field full">
				<span class="label">제목</span>
				<input class="input" name="title" required bind:value={titleVal} />
			</label>
		</div>

		<label class="check">
			<input type="checkbox" name="published" value="true" />
			<span>바로 공개</span>
		</label>

		<AdminMarkdownField bind:md getAssetSlug={() => slugVal} />

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
			<button type="submit" class="btn primary">발행</button>
			<button type="button" class="btn" onclick={autosave} disabled={autosaveStatus === 'saving'}>초안 저장</button>
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

		.field.full {
			grid-column: 1 / -1;
		}
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
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

	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
