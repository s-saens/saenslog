export function setupCodeBlocks(node: Element) {
	const pres = node.querySelectorAll('pre');

	pres.forEach((pre) => {
		if (pre.parentElement?.classList.contains('code-collapse-wrapper')) return;

		const lineCount = (pre.textContent ?? '').split('\n').length;
		if (lineCount <= 13) return;

		const wrapper = document.createElement('div');
		wrapper.className = 'code-collapse-wrapper collapsed';
		pre.parentNode!.insertBefore(wrapper, pre);
		wrapper.appendChild(pre);

		const btn = document.createElement('button');
		btn.className = 'code-collapse-btn';
		btn.setAttribute('aria-label', '코드 펼치기');
		btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
		wrapper.appendChild(btn);

		btn.addEventListener('click', () => {
			const isCollapsed = wrapper.classList.contains('collapsed');

			if (!isCollapsed) {
				const heightBefore = wrapper.getBoundingClientRect().height;
				wrapper.classList.remove('expanded');
				wrapper.classList.add('collapsed');
				btn.setAttribute('aria-label', '코드 펼치기');

				// 강제 리플로우
				void wrapper.offsetHeight;
				const rect = wrapper.getBoundingClientRect();

				if (rect.bottom <= 0) {
					// 접힌 블록이 뷰포트 위로 완전히 사라진 경우 → 블록 상단이 보이도록 스크롤
					wrapper.scrollIntoView({ behavior: 'instant', block: 'start' });
				} else {
					// 블록이 뷰포트에 아직 보이는 경우 → 줄어든 만큼 위로 보정
					const delta = heightBefore - rect.height;
					if (delta > 0) {
						window.scrollBy({ top: -delta, behavior: 'instant' });
					}
				}
			} else {
				// 펼치기
				wrapper.classList.remove('collapsed');
				wrapper.classList.add('expanded');
				btn.setAttribute('aria-label', '코드 접기');
			}
		});
	});
}
