import { renderMarkdownToHtml } from '$lib/server/markdown';

/** 프론트매터 없는 마크다운 조각(프로젝트 설명 등)을 HTML로 */
export function renderMarkdownContent(markdown: string): string {
	return renderMarkdownToHtml(markdown);
}
