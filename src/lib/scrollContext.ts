/**
 * 메인 콘텐츠 스크롤 영역(overflow-y: auto) — 레이아웃에서 setContext, 하위에서 getContext.
 * querySelector 대신 참조를 넘겨 내비·스크롤바·TOC가 동일한 엘리먼트를 사용한다.
 */
export const MAIN_SCROLL_KEY = Symbol('main-scroll');

export type MainScrollContext = {
	get scrollRoot(): HTMLElement | null;
};
