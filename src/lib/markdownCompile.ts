import hljs from 'highlight.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

import { POST_IMAGE_FIGURE_CLASS } from '$lib/browser/tiptapImageWithColorMode';

marked.use(
	markedHighlight({
		langPrefix: 'hljs language-',
		highlight(code, lang) {
			const language = hljs.getLanguage(lang) ? lang : 'plaintext';
			return hljs.highlight(code, { language }).value;
		}
	})
);

const renderer = new marked.Renderer();
const originalImage = renderer.image.bind(renderer);

function escapeHtmlAttr(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

renderer.image = function (token) {
	let href = token.href;
	if (!href.startsWith('/') && !href.startsWith('http')) {
		href = '/' + href;
	}
	const alt = typeof token.text === 'string' ? token.text : '';
	if (!alt.trim()) {
		return originalImage({ ...token, href });
	}
	const safe = escapeHtmlAttr(alt);
	const hrefEsc = escapeHtmlAttr(href);
	const titleAttr = token.title ? ` title="${escapeHtmlAttr(String(token.title))}"` : '';
	return `<figure class="${POST_IMAGE_FIGURE_CLASS}"><img src="${hrefEsc}" alt="${safe}" loading="lazy"${titleAttr} /><figcaption>${safe}</figcaption></figure>`;
};

renderer.table = function (token) {
	const originalTable = marked.Renderer.prototype.table.call(this, token);
	return `<div class="table-wrapper">${originalTable}</div>`;
};

marked.setOptions({ renderer });

/** marked가 `<p><figure>…</figure></p>`로 감쌀 때 블록으로 분리 */
function unwrapStandaloneImageFigures(html: string): string {
	return html.replace(
		new RegExp(
			`<p>\\s*(<figure class="${POST_IMAGE_FIGURE_CLASS}">[\\s\\S]*?<\\/figure>)\\s*<\\/p>`,
			'gi'
		),
		'$1'
	);
}

export function renderMarkdownToHtml(markdown: string): string {
	const raw = marked.parse(markdown, { async: false }) as string;
	return unwrapStandaloneImageFigures(raw);
}
