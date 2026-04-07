const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
	<rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
	<path d="M15 9V7C15 5.89543 14.1046 5 13 5H7C5.89543 5 5 5.89543 5 7V13C5 14.1046 5.89543 15 7 15H9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
	<polyline points="4 12 9 17 20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function ensureShell(pre: HTMLPreElement): HTMLElement {
	if (pre.parentElement?.classList.contains('code-block-shell')) {
		return pre.parentElement as HTMLElement;
	}
	const shell = document.createElement('div');
	shell.className = 'code-block-shell';
	pre.parentNode!.insertBefore(shell, pre);
	shell.appendChild(pre);
	return shell;
}

function addCopyTrack(shell: HTMLElement) {
	if (shell.querySelector('.code-copy-track')) return;

	const track = document.createElement('div');
	track.className = 'code-copy-track';

	const btn = document.createElement('button');
	btn.className = 'code-copy-btn';
	btn.type = 'button';
	btn.setAttribute('aria-label', '코드 복사');
	btn.innerHTML = COPY_ICON;

	btn.addEventListener('click', async (e) => {
		e.preventDefault();
		e.stopPropagation();
		const pre = shell.querySelector('pre');
		if (!pre) return;
		const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
		try {
			await navigator.clipboard.writeText(code);
			btn.innerHTML = CHECK_ICON;
			btn.classList.add('copied');
			setTimeout(() => {
				btn.innerHTML = COPY_ICON;
				btn.classList.remove('copied');
			}, 1500);
		} catch {
			const ta = document.createElement('textarea');
			ta.value = code;
			ta.style.position = 'fixed';
			ta.style.opacity = '0';
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
			btn.innerHTML = CHECK_ICON;
			btn.classList.add('copied');
			setTimeout(() => {
				btn.innerHTML = COPY_ICON;
				btn.classList.remove('copied');
			}, 1500);
		}
	});

	track.appendChild(btn);

	const preWrap = shell.querySelector('.code-pre-wrap');
	if (preWrap) {
		preWrap.appendChild(track);
	} else {
		shell.appendChild(track);
	}
}

export function setupCodeBlocks(node: Element) {
	const pres = node.querySelectorAll('pre');

	pres.forEach((pre) => {
		const shell = ensureShell(pre as HTMLPreElement);
		const p = pre as HTMLPreElement;

		if (!p.parentElement?.classList.contains('code-collapse-wrapper')) {
			const lineCount = (p.textContent ?? '').split('\n').length;
			if (lineCount > 13) {
				const wrapper = document.createElement('div');
				wrapper.className = 'code-collapse-wrapper collapsed';
				const inner = document.createElement('div');
				inner.className = 'code-pre-wrap';
				shell.insertBefore(wrapper, p);
				wrapper.appendChild(inner);
				inner.appendChild(p);

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

						void wrapper.offsetHeight;
						const rect = wrapper.getBoundingClientRect();

						if (rect.bottom <= 0) {
							wrapper.scrollIntoView({ behavior: 'instant', block: 'start' });
						} else {
							const delta = heightBefore - rect.height;
							if (delta > 0) {
								window.scrollBy({ top: -delta, behavior: 'instant' });
							}
						}
					} else {
						wrapper.classList.remove('collapsed');
						wrapper.classList.add('expanded');
						btn.setAttribute('aria-label', '코드 접기');
					}
				});
			}
		}

		addCopyTrack(shell);
	});
}
