import hljs from 'highlight.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

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
const originalImage = renderer.image;

renderer.image = function (token) {
	let href = token.href;
	if (!href.startsWith('/') && !href.startsWith('http')) {
		href = '/' + href;
	}
	return originalImage.call(this, { ...token, href });
};

renderer.table = function (token) {
	const originalTable = marked.Renderer.prototype.table.call(this, token);
	return `<div class="table-wrapper">${originalTable}</div>`;
};

marked.setOptions({ renderer });

export function renderMarkdownToHtml(markdown: string): string {
	return marked.parse(markdown, { async: false }) as string;
}
