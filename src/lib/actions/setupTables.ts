const SCROLL_AMOUNT = 160;

const CHEVRON_LEFT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
const CHEVRON_RIGHT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

export function setupTables(node: Element) {
	node.querySelectorAll<HTMLElement>('.table-wrapper').forEach((wrapper) => {
		if (wrapper.parentElement?.classList.contains('table-container')) return;
		if (wrapper.querySelector('img')) return; // 이미지 표는 스크롤 불필요

		// 스크롤 컨테이너로 감싸기
		const container = document.createElement('div');
		container.className = 'table-container';
		wrapper.parentNode!.insertBefore(container, wrapper);
		container.appendChild(wrapper);

		const leftBtn = document.createElement('button');
		leftBtn.className = 'table-scroll-btn table-scroll-left';
		leftBtn.setAttribute('aria-label', '왼쪽으로 스크롤');
		leftBtn.innerHTML = CHEVRON_LEFT;

		const rightBtn = document.createElement('button');
		rightBtn.className = 'table-scroll-btn table-scroll-right';
		rightBtn.setAttribute('aria-label', '오른쪽으로 스크롤');
		rightBtn.innerHTML = CHEVRON_RIGHT;

		container.appendChild(leftBtn);
		container.appendChild(rightBtn);

		leftBtn.addEventListener('click', () => {
			wrapper.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
		});

		rightBtn.addEventListener('click', () => {
			wrapper.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
		});

		function update() {
			const scrollLeft = wrapper.scrollLeft;
			const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
			const scrollable = maxScroll > 1;

			leftBtn.classList.toggle('visible', scrollable && scrollLeft > 1);
			rightBtn.classList.toggle('visible', scrollable && scrollLeft < maxScroll - 1);
		}

		wrapper.addEventListener('scroll', update, { passive: true });

		const ro = new ResizeObserver(update);
		ro.observe(wrapper);

		requestAnimationFrame(update);
	});
}
