import { mergeAttributes } from '@tiptap/core';
import { Image } from '@tiptap/extension-image';

export type ImageColorMode = 'none' | 'light' | 'dark';

/** 본문·에디터에서 캡션(alt)을 이미지 아래 figcaption으로 동기화할 때 사용 */
export const POST_IMAGE_FIGURE_CLASS = 'post-image-figure';

/** SunIcon.svelte / MoonIcon.svelte와 동일 path, stroke만 currentColor */
const ICON_SUN = `<svg class="tiptap-img-mode-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 12L23 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 2V1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 23V22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 20L19 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4L19 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 20L5 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 4L5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 12L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ICON_MOON = `<svg class="tiptap-img-mode-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 11.5066C3 16.7497 7.25034 21 12.4934 21C16.2209 21 19.4466 18.8518 21 15.7259C12.4934 15.7259 8.27411 11.5066 8.27411 3C5.14821 4.55344 3 7.77915 3 11.5066Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ICON_NONE = `<svg class="tiptap-img-mode-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

/**
 * 이미지에 data-image-color-mode(none|light|dark)를 붙이고, 편집기에서 우측 상단에 모드 토글을 둔다.
 * 블로그 본문에서는 [data-theme]과 조합해 반전 표시.
 */
export const ImageWithColorMode = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			colorMode: {
				default: 'none' as ImageColorMode,
				parseHTML: (element) => {
					const tag = element.tagName?.toUpperCase?.() ?? '';
					const target =
						tag === 'FIGURE' ? element.querySelector('img') : tag === 'IMG' ? element : null;
					const raw = target?.getAttribute('data-image-color-mode');
					if (raw === 'light' || raw === 'dark') return raw;
					return 'none';
				},
				renderHTML: (attrs) => {
					const m = attrs.colorMode as ImageColorMode;
					if (!m || m === 'none') return {};
					return { 'data-image-color-mode': m };
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: `figure.${POST_IMAGE_FIGURE_CLASS}`,
				getAttrs: (element: HTMLElement) => {
					const im = element.querySelector('img');
					if (!im || !im.getAttribute('src')) return false;
					const cap =
						element.querySelector('figcaption')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
					const alt = im.getAttribute('alt')?.trim() ?? '';
					const rawMode = im.getAttribute('data-image-color-mode');
					const colorMode: ImageColorMode =
						rawMode === 'light' || rawMode === 'dark' ? rawMode : 'none';
					return {
						src: im.getAttribute('src'),
						alt: cap || alt || null,
						title: im.getAttribute('title'),
						width: im.getAttribute('width'),
						height: im.getAttribute('height'),
						colorMode
					};
				}
			},
			...(this.parent?.() ?? [])
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		const merged = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
		const caption = String(node.attrs.alt ?? '').trim();
		if (!caption) {
			return ['img', merged];
		}
		return [
			'figure',
			{ class: POST_IMAGE_FIGURE_CLASS },
			['img', merged],
			['figcaption', {}, caption]
		];
	},

	addNodeView() {
		return ({ node: initialNode, editor, getPos, HTMLAttributes }) => {
			let node = initialNode;
			const wrap = document.createElement('div');
			wrap.className = 'tiptap-image-color-wrap';

			const toolbar = document.createElement('div');
			toolbar.className = 'tiptap-image-color-toolbar';
			toolbar.setAttribute('contenteditable', 'false');

			const img = document.createElement('img');
			const figure = document.createElement('figure');
			figure.className = POST_IMAGE_FIGURE_CLASS;
			const figcaption = document.createElement('figcaption');

			const applyAttrs = (n: typeof node) => {
				const merged = mergeAttributes(HTMLAttributes, {
					src: n.attrs.src,
					alt: n.attrs.alt ?? '',
					title: n.attrs.title ?? undefined,
					width: n.attrs.width ?? undefined,
					height: n.attrs.height ?? undefined
				});
				for (const [key, val] of Object.entries(merged)) {
					if (val == null || val === '') {
						img.removeAttribute(key);
						continue;
					}
					img.setAttribute(key, String(val));
				}
				const mode = (n.attrs.colorMode as ImageColorMode) || 'none';
				if (mode !== 'none') img.setAttribute('data-image-color-mode', mode);
				else img.removeAttribute('data-image-color-mode');
			};

			const syncLayout = (n: typeof node) => {
				applyAttrs(n);
				if (img.parentNode) img.parentNode.removeChild(img);
				while (toolbar.nextSibling) wrap.removeChild(toolbar.nextSibling);
				const caption = String(n.attrs.alt ?? '').trim();
				if (!caption) {
					wrap.appendChild(img);
				} else {
					figcaption.textContent = caption;
					figure.appendChild(img);
					figure.appendChild(figcaption);
					wrap.appendChild(figure);
				}
			};

			const mkBtn = (mode: ImageColorMode, label: string, html: string) => {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'tiptap-img-mode-btn';
				btn.dataset.mode = mode;
				btn.setAttribute('aria-label', label);
				btn.innerHTML = html;
				btn.addEventListener('mousedown', (e) => e.preventDefault());
				btn.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					const pos = getPos();
					if (pos === undefined) return;
					editor
						.chain()
						.focus()
						.setNodeSelection(pos)
						.updateAttributes('image', { colorMode: mode })
						.run();
				});
				return btn;
			};

			const btnNone = mkBtn('none', '색 반전 없음 (테마와 무관)', ICON_NONE);
			const btnLight = mkBtn('light', '라이트 기준 — 사이트 다크 모드에서만 색 반전', ICON_SUN);
			const btnDark = mkBtn('dark', '다크 기준 — 사이트 라이트 모드에서만 색 반전', ICON_MOON);

			const syncPressed = (n: typeof node) => {
				const m = ((n.attrs.colorMode as ImageColorMode) || 'none') as ImageColorMode;
				for (const b of [btnNone, btnLight, btnDark]) {
					const mode = b.dataset.mode as ImageColorMode;
					const on = mode === m;
					b.setAttribute('aria-pressed', on ? 'true' : 'false');
					b.classList.toggle('is-active', on);
				}
			};

			toolbar.append(btnNone, btnLight, btnDark);
			wrap.appendChild(toolbar);

			syncLayout(node);
			syncPressed(node);

			return {
				dom: wrap,
				update: (updated) => {
					if (updated.type !== node.type) return false;
					syncLayout(updated);
					syncPressed(updated);
					node = updated;
					return true;
				}
			};
		};
	}
});
