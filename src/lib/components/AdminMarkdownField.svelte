<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import Image from '@tiptap/extension-image';
	import Link from '@tiptap/extension-link';
	import Placeholder from '@tiptap/extension-placeholder';
	import StarterKit from '@tiptap/starter-kit';
	import {
		collectClipboardFiles,
		encodePublicPath,
		uploadMediaFile
	} from '$lib/browser/markdownPasteUpload';
	import { htmlToMarkdown } from '$lib/browser/htmlToMarkdown';
	import { AudioBlock } from '$lib/browser/tiptapAudioBlock';
	import { renderMarkdownToHtml } from '$lib/markdownCompile';
	import AdminMediaLibraryModal from '$lib/components/AdminMediaLibraryModal.svelte';

	let {
		md = $bindable(''),
		name = 'content_md',
		rows = 22,
		label = '본문',
		docSyncKey = undefined as string | number | undefined,
		getAssetSlug = () => ''
	}: {
		md: string;
		name?: string;
		rows?: number;
		label?: string;
		docSyncKey?: string | number | undefined;
		/** 붙여넣기 업로드 시 `static/blog/<slug>/` 에 순번 파일로 저장 */
		getAssetSlug?: () => string;
	} = $props();

	let hostEl = $state<HTMLDivElement | undefined>(undefined);
	let editorInst = $state<Editor | null>(null);
	let mediaOpen = $state(false);

	let syncedDocKey: string | number | undefined = undefined;

	function insertSnippet(snippet: string) {
		const ed = editorInst;
		if (!ed) {
			md += snippet;
			return;
		}
		const chunk = snippet.trim();
		if (!chunk) return;
		ed.chain().focus().insertContent(chunk).run();
	}

	$effect(() => {
		const ed = editorInst;
		const key = docSyncKey;
		const body = md;
		if (!ed || key == null) return;
		if (syncedDocKey === key) return;
		syncedDocKey = key;
		ed.commands.setContent(renderMarkdownToHtml(body), { emitUpdate: false });
	});

	onMount(() => {
		if (!browser || !hostEl) return;

		const ed = new Editor({
			element: hostEl,
			extensions: [
				StarterKit.configure({
					heading: { levels: [1, 2, 3, 4, 5, 6] }
				}),
				Link.configure({
					openOnClick: false,
					autolink: true,
					HTMLAttributes: { rel: 'noopener noreferrer' }
				}),
				Image.configure({
					inline: false,
					allowBase64: false,
					HTMLAttributes: { loading: 'lazy' }
				}),
				AudioBlock,
				Placeholder.configure({
					placeholder:
						'내용을 입력하세요. 새 줄에서 # 를 치고 띄우면 제목이 됩니다. 이미지는 붙여 넣을 수 있습니다.'
				})
			],
			content: renderMarkdownToHtml(md),
			editorProps: {
				attributes: {
					class: 'tiptap notion-ish-editor',
					spellcheck: 'true'
				},
				handlePaste(_view, event) {
					const ce = event as ClipboardEvent;
					const dt = ce.clipboardData;
					if (!dt) return false;
					const files = collectClipboardFiles(dt);
					if (!files.length) return false;
					ce.preventDefault();
					void (async () => {
						for (const file of files) {
							const up = await uploadMediaFile(file, { slug: getAssetSlug() });
							if (!up) continue;
							if (up.kind === 'image') {
								ed.chain()
									.focus()
									.setImage({ src: encodePublicPath(up.url), alt: '' })
									.run();
							} else {
								const src = encodePublicPath(up.url);
								ed.chain()
									.focus()
									.insertContent(`<audio controls src="${src}" preload="metadata"></audio>`)
									.run();
							}
						}
					})();
					return true;
				}
			},
			onUpdate: ({ editor }) => {
				md = htmlToMarkdown(editor.getHTML());
			}
		});

		editorInst = ed;
		if (docSyncKey != null) syncedDocKey = docSyncKey;

		return () => {
			ed.destroy();
			editorInst = null;
		};
	});
</script>

<!-- label로 전체를 감싸면 클릭이 첫 labelable(미디어 버튼)로 전달되는 브라우저 동작이 있어 div 사용 -->
<div class="field full md-field">
	<span class="labelrow">
		<span class="label" id="admin-md-field-label"
			>{label} (노션 스타일 편집 · 저장 시 마크다운)</span
		>
		<button type="button" class="linkish" onclick={() => (mediaOpen = true)}>
			미디어 라이브러리
		</button>
	</span>
	<p class="paste-hint">
		미디어는 <strong>슬러그 입력 후</strong> 붙여 넣을 수 있습니다. 새 줄에서 <kbd>#</kbd>~<kbd
			>######</kbd
		>
		+ 스페이스로 제목. <kbd>Ctrl</kbd>+<kbd>V</kbd> / <kbd>⌘</kbd>+<kbd>V</kbd>.
	</p>
	{#if !browser}
		<textarea
			class="textarea"
			{name}
			{rows}
			required
			bind:value={md}
			aria-labelledby="admin-md-field-label"
		></textarea>
	{:else}
		<div
			class="tiptap-shell"
			style:min-height={`calc(${rows} * 1.45 * 0.82rem)`}
			bind:this={hostEl}
			aria-labelledby="admin-md-field-label"
		></div>
		<textarea
			class="visually-hidden"
			{name}
			{rows}
			required
			tabindex={-1}
			aria-hidden="true"
			bind:value={md}
		></textarea>
	{/if}
</div>

<AdminMediaLibraryModal bind:open={mediaOpen} onInsert={insertSnippet} />

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field.full {
		grid-column: 1 / -1;
	}

	.labelrow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.label {
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	.linkish {
		font: inherit;
		font-size: 0.78rem;
		border: none;
		background: none;
		padding: 0;
		color: var(--text-secondary);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}

	.linkish:hover {
		color: var(--text);
	}

	.paste-hint {
		margin: 0;
		font-size: 0.72rem;
		line-height: 1.4;
		color: var(--text-tertiary);
	}

	.paste-hint kbd {
		font: inherit;
		font-size: 0.68rem;
		padding: 0.05em 0.35em;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: color-mix(in srgb, var(--bg-lighter) 90%, transparent);
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
		min-height: 28rem;
	}

	.md-field {
		gap: 0.45rem;
	}

	.tiptap-shell {
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
		padding: 0.55rem 0.75rem;
		overflow: auto;
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

	/* TipTap 실제 루트는 에디터가 mount 한 뒤 .tiptap (scoped 깨짐) → :global */
	:global(.notion-ish-editor.tiptap) {
		font: inherit;
		font-size: 0.88rem;
		line-height: 1.55;
		min-height: 4rem;
		outline: none;
	}

	:global(.notion-ish-editor.tiptap p.is-editor-empty:first-child::before) {
		color: var(--text-tertiary);
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	:global(.notion-ish-editor.tiptap h1) {
		font-size: 1.65rem;
		font-weight: 650;
		line-height: 1.25;
		margin: 0.35rem 0 0.5rem;
		letter-spacing: -0.02em;
	}

	:global(.notion-ish-editor.tiptap h2) {
		font-size: 1.35rem;
		font-weight: 620;
		line-height: 1.3;
		margin: 0.5rem 0 0.4rem;
	}

	:global(.notion-ish-editor.tiptap h3) {
		font-size: 1.12rem;
		font-weight: 600;
		margin: 0.45rem 0 0.35rem;
	}

	:global(.notion-ish-editor.tiptap h4),
	:global(.notion-ish-editor.tiptap h5),
	:global(.notion-ish-editor.tiptap h6) {
		font-size: 1rem;
		font-weight: 600;
		margin: 0.4rem 0 0.3rem;
	}

	:global(.notion-ish-editor.tiptap p) {
		margin: 0.35rem 0;
	}

	:global(.notion-ish-editor.tiptap ul),
	:global(.notion-ish-editor.tiptap ol) {
		margin: 0.35rem 0;
		padding-left: 1.35rem;
	}

	:global(.notion-ish-editor.tiptap li) {
		margin: 0.15rem 0;
	}

	:global(.notion-ish-editor.tiptap blockquote) {
		margin: 0.45rem 0;
		padding-left: 0.85rem;
		border-left: 3px solid var(--border);
		color: var(--text-secondary);
	}

	:global(.notion-ish-editor.tiptap pre) {
		margin: 0.5rem 0;
		padding: 0.65rem 0.75rem;
		border-radius: 8px;
		background: color-mix(in srgb, var(--text) 6%, var(--bg));
		overflow-x: auto;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.78rem;
		line-height: 1.4;
	}

	:global(.notion-ish-editor.tiptap code) {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.82em;
		padding: 0.1em 0.3em;
		border-radius: 4px;
		background: color-mix(in srgb, var(--text) 7%, var(--bg));
	}

	:global(.notion-ish-editor.tiptap pre code) {
		padding: 0;
		background: none;
	}

	:global(.notion-ish-editor.tiptap hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 1rem 0;
	}

	:global(.notion-ish-editor.tiptap img) {
		display: block;
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		margin: 0.5rem 0;
	}

	:global(.notion-ish-editor.tiptap audio) {
		display: block;
		width: 100%;
		margin: 0.5rem 0;
	}

	:global(.notion-ish-editor.tiptap a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
