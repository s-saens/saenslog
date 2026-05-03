import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

let turndown: TurndownService | null = null;

function getTurndown(): TurndownService {
	if (!turndown) {
		const t = new TurndownService({
			codeBlockStyle: 'fenced',
			headingStyle: 'atx',
			bulletListMarker: '-',
			emDelimiter: '*'
		});
		t.use(gfm);
		t.keep((node) => node.nodeName === 'IMG' || node.nodeName === 'AUDIO');
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
