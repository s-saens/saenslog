import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

import { POST_IMAGE_FIGURE_CLASS } from '$lib/browser/tiptapImageWithColorMode';

let turndown: TurndownService | null = null;

function escAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function getTurndown(): TurndownService {
	if (!turndown) {
		const t = new TurndownService({
			codeBlockStyle: 'fenced',
			headingStyle: 'atx',
			bulletListMarker: '-',
			emDelimiter: '*'
		});
		t.use(gfm);
		t.addRule('imageColorMode', {
			filter: (node) =>
				node.nodeName === 'IMG' &&
				Boolean((node as HTMLImageElement).getAttribute('data-image-color-mode')),
			replacement(_content, node) {
				const el = node as HTMLImageElement;
				const src = el.getAttribute('src') || '';
				const alt = el.getAttribute('alt') || '';
				const mode = el.getAttribute('data-image-color-mode') || '';
				const title = el.getAttribute('title');
				const w = el.getAttribute('width');
				const h = el.getAttribute('height');
				let tag = `<img src="${escAttr(src)}" alt="${escAttr(alt)}" loading="lazy" data-image-color-mode="${escAttr(mode)}"`;
				if (title) tag += ` title="${escAttr(title)}"`;
				if (w) tag += ` width="${escAttr(w)}"`;
				if (h) tag += ` height="${escAttr(h)}"`;
				tag += ' />';
				return '\n\n' + tag + '\n\n';
			}
		});
		t.addRule('postImageFigure', {
			filter: (node) =>
				node.nodeName === 'FIGURE' &&
				(node as HTMLElement).classList.contains(POST_IMAGE_FIGURE_CLASS),
			replacement(_content, node) {
				return '\n\n' + (node as HTMLElement).outerHTML + '\n\n';
			}
		});
		/** GFM 파이프 표는 셀에 블록(이미지·figure 등)이 있으면 깨지므로 HTML(+블로그와 동일 wrapper)로 유지 */
		t.addRule('richTableAsHtml', {
			filter(node) {
				if (node.nodeName !== 'TABLE') return false;
				const el = node as HTMLElement;
				return Boolean(
					el.querySelector('img, figure, audio, pre, video, iframe, .tiptap-image-color-wrap')
				);
			},
			replacement(_content, node) {
				const tbl = (node as HTMLElement).outerHTML;
				return `\n\n<div class="table-wrapper">${tbl}</div>\n\n`;
			}
		});
		turndown = t;
	}
	return turndown;
}

/** TipTap·블로그와 동일 파이프를 쓰려고 HTML(=getHTML) → 저장용 마크다운 */
export function htmlToMarkdown(html: string): string {
	return getTurndown()
		.turndown(html || '')
		.trim();
}
