<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { Editor } from '@tiptap/core';
	import type { EditorView } from '@tiptap/pm/view';
	import Link from '@tiptap/extension-link';
	import Placeholder from '@tiptap/extension-placeholder';
	import StarterKit from '@tiptap/starter-kit';
	import { TableKit } from '@tiptap/extension-table/kit';
	import {
		collectClipboardFiles,
		encodePublicPath,
		uploadMediaFile
	} from '$lib/browser/markdownPasteUpload';
	import { htmlToMarkdown } from '$lib/browser/htmlToMarkdown';
	import { AudioBlock } from '$lib/browser/tiptapAudioBlock';
	import { ImageWithColorMode } from '$lib/browser/tiptapImageWithColorMode';
	import { AdminTable } from '$lib/browser/tiptapAdminTable';
	import { SlashInsertTable } from '$lib/browser/tiptapSlashInsertTable';
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

	let captionOpen = $state(false);
	let captionDraft = $state('');
	let captionPos = $state<number | null>(null);
	let captionInputEl = $state<HTMLInputElement | undefined>(undefined);

	/** 표 안에서 ⌘/Ctrl+N·D — 행/열 추가·삭제 팝업 */
	let tableDimMode = $state<null | 'add' | 'del'>(null);
	let tableDimSel = $state(0);
	let tableDimModalEl = $state<HTMLDivElement | undefined>(undefined);

	let syncedDocKey: string | number | undefined = undefined;

	function resolveImageNodePos(view: EditorView, img: HTMLImageElement): number | null {
		let pos = view.posAtDOM(img, 0);
		if (pos == null) return null;
		let node = view.state.doc.nodeAt(pos);
		if (node?.type.name === 'image') return pos;
		if (pos > 0) {
			node = view.state.doc.nodeAt(pos - 1);
			if (node?.type.name === 'image') return pos - 1;
		}
		return null;
	}

	function closeCaptionModal() {
		captionOpen = false;
		captionPos = null;
		captionDraft = '';
	}

	function saveImageCaption() {
		const ed = editorInst;
		const pos = captionPos;
		if (!ed || pos == null) {
			closeCaptionModal();
			return;
		}
		ed.chain()
			.focus()
			.setNodeSelection(pos)
			.updateAttributes('image', { alt: captionDraft.trim() })
			.run();
		closeCaptionModal();
	}

	$effect(() => {
		if (!browser || !captionOpen) return;
		void tick().then(() => captionInputEl?.focus?.());
	});

	$effect(() => {
		if (!browser || !captionOpen) return;
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeCaptionModal();
		};
		window.addEventListener('keydown', esc);
		return () => window.removeEventListener('keydown', esc);
	});

	function closeTableDimModal() {
		tableDimMode = null;
		tableDimSel = 0;
		void tick().then(() => editorInst?.chain().focus().run());
	}

	function confirmTableDimModal() {
		const ed = editorInst;
		if (!ed || tableDimMode === null) {
			closeTableDimModal();
			return;
		}
		if (tableDimMode === 'add') {
			if (tableDimSel === 0 && ed.can().addRowAfter()) ed.chain().focus().addRowAfter().run();
			else if (tableDimSel === 1 && ed.can().addColumnAfter()) ed.chain().focus().addColumnAfter().run();
		} else {
			if (tableDimSel === 0 && ed.can().deleteRow()) ed.chain().focus().deleteRow().run();
			else if (tableDimSel === 1 && ed.can().deleteColumn()) ed.chain().focus().deleteColumn().run();
		}
		closeTableDimModal();
	}

	function handleTableDimKeydown(e: KeyboardEvent) {
		if (tableDimMode === null) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			closeTableDimModal();
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			confirmTableDimModal();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			e.stopPropagation();
			tableDimSel = Math.min(1, tableDimSel + 1);
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			e.stopPropagation();
			tableDimSel = Math.max(0, tableDimSel - 1);
			return;
		}
	}

	$effect(() => {
		if (!browser || tableDimMode === null) return;
		const onKey = (e: KeyboardEvent) => {
			handleTableDimKeydown(e);
		};
		window.addEventListener('keydown', onKey, true);
		void tick().then(() => tableDimModalEl?.focus());
		return () => window.removeEventListener('keydown', onKey, true);
	});

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
				TableKit.configure({ table: false }),
				AdminTable,
				SlashInsertTable,
				Link.configure({
					openOnClick: false,
					autolink: true,
					HTMLAttributes: { rel: 'noopener noreferrer' }
				}),
				ImageWithColorMode.configure({
					inline: false,
					allowBase64: false,
					HTMLAttributes: { loading: 'lazy' }
				}),
				AudioBlock,
				Placeholder.configure({
					placeholder:
						'내용을 입력하세요. # + 스페이스로 제목. /표 또는 /table + 스페이스로 표 삽입. 표 안에서 ⌘/Ctrl+N·D 로 행·열 편집.'
				})
			],
			content: renderMarkdownToHtml(md),
			editorProps: {
				attributes: {
					class: 'tiptap notion-ish-editor',
					spellcheck: 'true'
				},
				handleDOMEvents: {
					keydown(_view, event) {
						const e = event as KeyboardEvent;
						if (tableDimMode !== null) return false;
						const mod = e.ctrlKey || e.metaKey;
						if (!mod) return false;
						const key = e.key.toLowerCase();
						if (key === 'n') {
							if (!ed.isActive('table')) return false;
							e.preventDefault();
							tableDimMode = 'add';
							tableDimSel = 0;
							return true;
						}
						if (key === 'd') {
							if (!ed.isActive('table')) return false;
							e.preventDefault();
							tableDimMode = 'del';
							tableDimSel = 0;
							return true;
						}
						return false;
					},
					dblclick(view, event) {
						const t = event.target;
						if (!(t instanceof HTMLImageElement) || !view.dom.contains(t)) return false;
						const pos = resolveImageNodePos(view, t);
						if (pos == null) return false;
						event.preventDefault();
						const node = view.state.doc.nodeAt(pos);
						if (!node) return true;
						captionPos = pos;
						captionDraft = String(node.attrs.alt ?? '');
						captionOpen = true;
						return true;
					}
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
		+ 스페이스로 제목. <kbd>Ctrl</kbd>+<kbd>V</kbd> / <kbd>⌘</kbd>+<kbd>V</kbd>로 미디어 붙여넣기.
		<kbd>/표</kbd> 또는 <kbd>/table</kbd> 뒤
		<kbd>스페이스</kbd>로 표 삽입. 셀 안에서도 이미지 붙여넣기가 됩니다. 이미지는
		<strong>더블클릭</strong>하면 캡션을 넣을 수 있고, 글에서는 사진 바로 아래에 표시됩니다. 		표 위에 마우스를 올리면 삭제(×)가 나타납니다. 표 안에서 <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>N</kbd>은
		행·열 추가, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>D</kbd>는 행·열 삭제 팝업(↑↓ 선택, Enter, Esc 취소).
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

{#if captionOpen}
	<div
		class="cap-backdrop"
		role="button"
		tabindex="-1"
		onclick={closeCaptionModal}
		onkeydown={(e) => e.key === 'Enter' && closeCaptionModal()}
		aria-label="닫기"
	></div>
	<div class="cap-modal" role="dialog" aria-modal="true" aria-labelledby="cap-title">
		<h2 id="cap-title" class="cap-title">이미지 캡션</h2>
		<p class="cap-sub">
			저장 시 <code class="cap-code">![캡션](이미지 주소)</code> 형태(alt)로 들어갑니다.
		</p>
		<form
			class="cap-form"
			onsubmit={(e) => {
				e.preventDefault();
				saveImageCaption();
			}}
		>
			<input
				type="text"
				class="cap-input"
				bind:this={captionInputEl}
				bind:value={captionDraft}
				placeholder="캡션 (비워 두면 alt 없음)"
				aria-label="캡션"
				autocomplete="off"
			/>
			<div class="cap-actions">
				<button type="button" class="cap-btn ghost" onclick={closeCaptionModal}>취소</button>
				<button type="submit" class="cap-btn primary">저장</button>
			</div>
		</form>
	</div>
{/if}

{#if tableDimMode !== null}
	<div
		class="cap-backdrop"
		role="button"
		tabindex="-1"
		onclick={closeTableDimModal}
		onkeydown={(e) => e.key === 'Enter' && closeTableDimModal()}
		aria-label="닫기"
	></div>
	<div
		bind:this={tableDimModalEl}
		class="cap-modal tbl-dim-modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="tbl-dim-title"
		tabindex="-1"
	>
		<h2 id="tbl-dim-title" class="cap-title">
			{tableDimMode === 'add' ? '행·열 추가' : '행·열 삭제'}
		</h2>
		<p class="cap-sub tbl-dim-hint">
			<kbd>↑</kbd><kbd>↓</kbd>로 선택 · <kbd>Enter</kbd> 적용 · <kbd>Esc</kbd> 취소
		</p>
		<div class="tbl-dim-list">
			<button
				type="button"
				id="tbl-dim-opt-0"
				class="tbl-dim-option"
				class:is-selected={tableDimSel === 0}
				onclick={() => (tableDimSel = 0)}
			>
				{tableDimMode === 'add' ? '행 추가 (현재 행 아래)' : '행 삭제 (현재 행)'}
			</button>
			<button
				type="button"
				id="tbl-dim-opt-1"
				class="tbl-dim-option"
				class:is-selected={tableDimSel === 1}
				onclick={() => (tableDimSel = 1)}
			>
				{tableDimMode === 'add' ? '열 추가 (현재 열 오른쪽)' : '열 삭제 (현재 열)'}
			</button>
		</div>
		<div class="cap-actions">
			<button type="button" class="cap-btn ghost" onclick={closeTableDimModal}>취소</button>
			<button type="button" class="cap-btn primary" onclick={confirmTableDimModal}>적용</button>
		</div>
	</div>
{/if}

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

	:global(.notion-ish-editor.tiptap .admin-editor-table-wrap) {
		position: relative;
		margin: 0.45rem 0;
	}

	:global(.notion-ish-editor.tiptap .admin-editor-table-del) {
		position: absolute;
		top: 4px;
		right: 4px;
		z-index: 5;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		padding: 0;
		margin: 0;
		border: 1px solid color-mix(in srgb, #fff 12%, #7f1d1d);
		border-radius: 6px;
		background: #dc2626;
		color: #fff;
		font: inherit;
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		box-shadow: 0 2px 8px color-mix(in srgb, var(--text) 15%, transparent);
		transition:
			opacity 0.12s ease,
			background-color 0.12s ease;
	}

	:global(.notion-ish-editor.tiptap .admin-editor-table-wrap:hover .admin-editor-table-del) {
		opacity: 1;
		pointer-events: auto;
	}

	:global(.notion-ish-editor.tiptap .admin-editor-table-wrap > table) {
		margin: 0;
	}

	:global(.notion-ish-editor.tiptap .admin-editor-table-del:hover) {
		background: #b91c1c;
	}

	:global(.notion-ish-editor.tiptap .admin-editor-table-del:focus-visible) {
		opacity: 1;
		pointer-events: auto;
		outline: 2px solid var(--accent);
		outline-offset: 2px;
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

	:global(.notion-ish-editor.tiptap table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.45rem 0;
		font-size: 0.84rem;
		border: 1px solid var(--border);
	}

	:global(.notion-ish-editor.tiptap th),
	:global(.notion-ish-editor.tiptap td) {
		border: 1px solid var(--border);
		padding: 0.35rem 0.5rem;
		vertical-align: top;
		text-align: left;
	}

	:global(.notion-ish-editor.tiptap th) {
		font-weight: 600;
		background: color-mix(in srgb, var(--text) 6%, var(--bg));
	}

	:global(.notion-ish-editor.tiptap td > p),
	:global(.notion-ish-editor.tiptap th > p) {
		margin: 0.15rem 0;
	}

	:global(.notion-ish-editor.tiptap td > p:first-child:last-child),
	:global(.notion-ish-editor.tiptap th > p:first-child:last-child) {
		margin: 0;
	}

	:global(.notion-ish-editor.tiptap table .tiptap-image-color-wrap) {
		margin: 0.25rem 0;
		max-width: 100%;
	}

	:global(.notion-ish-editor.tiptap table img) {
		max-width: 100%;
		height: auto;
	}

	:global(.notion-ish-editor.tiptap .tiptap-image-color-wrap) {
		position: relative;
		display: block;
		max-width: 100%;
		margin: 0.5rem 0;
	}

	:global(.notion-ish-editor.tiptap .tiptap-image-color-wrap img) {
		display: block;
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		margin: 0;
	}

	:global(.notion-ish-editor.tiptap .tiptap-image-color-wrap figure.post-image-figure) {
		margin: 0;
		max-width: 100%;
	}

	:global(.notion-ish-editor.tiptap .tiptap-image-color-wrap figure.post-image-figure figcaption) {
		margin-top: 0.35rem;
		font-size: 0.78rem;
		line-height: 1.35;
		color: var(--text-secondary);
		text-align: center;
	}

	:global(.notion-ish-editor.tiptap .tiptap-image-color-toolbar) {
		position: absolute;
		top: 6px;
		right: 6px;
		z-index: 2;
		display: flex;
		gap: 3px;
	}

	:global(.notion-ish-editor.tiptap .tiptap-img-mode-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(6px);
		color: var(--text-secondary);
		cursor: pointer;
		font: inherit;
		line-height: 0;
		transition:
			border-color 0.12s ease,
			background-color 0.12s ease,
			color 0.12s ease;
	}

	:global(.notion-ish-editor.tiptap .tiptap-img-mode-btn:hover) {
		border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
		color: var(--text);
	}

	:global(.notion-ish-editor.tiptap .tiptap-img-mode-btn.is-active) {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, var(--bg));
	}

	:global(.notion-ish-editor.tiptap .tiptap-img-mode-ic) {
		display: block;
		flex-shrink: 0;
	}

	/* 블록 이미지(node view 래퍼) 선택 시 */
	:global(.notion-ish-editor.tiptap .tiptap-image-color-wrap.ProseMirror-selectednode) {
		box-shadow:
			0 0 0 2px var(--bg),
			0 0 0 4px var(--accent);
		border-radius: 8px;
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

	.cap-backdrop {
		position: fixed;
		inset: 0;
		z-index: 3600;
		background: color-mix(in srgb, var(--text) 35%, transparent);
	}

	.cap-modal {
		position: fixed;
		z-index: 3601;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(92vw, 22rem);
		padding: 1rem 1.1rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 16px 48px color-mix(in srgb, var(--text) 18%, transparent);
	}

	.cap-title {
		margin: 0 0 0.4rem;
		font-size: 1rem;
		font-weight: 600;
	}

	.cap-sub {
		margin: 0 0 0.75rem;
		font-size: 0.72rem;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.cap-code {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.68em;
		padding: 0.08em 0.28em;
		border-radius: 4px;
		background: color-mix(in srgb, var(--text) 8%, var(--bg));
	}

	.cap-form {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.cap-input {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.45rem 0.55rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
		width: 100%;
		box-sizing: border-box;
	}

	.cap-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.cap-btn {
		font: inherit;
		font-size: 0.78rem;
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		cursor: pointer;
	}

	.cap-btn.ghost {
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-secondary);
	}

	.cap-btn.primary {
		border: 1px solid var(--accent);
		background: var(--accent);
		color: var(--bg);
	}

	.tbl-dim-modal {
		outline: none;
	}

	.tbl-dim-hint kbd {
		font: inherit;
		font-size: 0.68rem;
		padding: 0.05em 0.3em;
		margin: 0 0.1em;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: color-mix(in srgb, var(--bg-lighter) 90%, transparent);
	}

	.tbl-dim-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 0.85rem;
	}

	.tbl-dim-option {
		font: inherit;
		font-size: 0.82rem;
		text-align: left;
		width: 100%;
		padding: 0.45rem 0.55rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			border-color 0.12s ease,
			background-color 0.12s ease,
			color 0.12s ease;
	}

	.tbl-dim-option:hover {
		border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
		color: var(--text);
	}

	.tbl-dim-option.is-selected {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, var(--bg));
		color: var(--text);
		font-weight: 550;
	}
</style>
