/** wheel에서 preventDefault를 쓰기 위해 passive: false 리스너로 등록 */
export function nonPassiveWheel(
	node: HTMLElement,
	handler: (e: WheelEvent) => void
): { destroy: () => void } {
	const fn = (e: WheelEvent) => handler(e);
	node.addEventListener('wheel', fn, { passive: false });
	return {
		destroy() {
			node.removeEventListener('wheel', fn);
		}
	};
}
