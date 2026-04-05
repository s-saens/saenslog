interface Heading {
	el: HTMLElement;
	level: number;
	text: string;
	id: string;
}

const X_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

const STYLE_ID = 'toc-widget-styles';

function injectStyles() {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
.toc-widget {
	position: fixed;
	top: 4.75rem;
	/* 블로그 컨테이너(max-width 650px) 오른쪽 끝 정렬 */
	right: max(2rem, calc(50% - 325px));
	z-index: 200;
	width: fit-content;
	pointer-events: auto;
}
.toc-pill {
	padding: 0.28rem 0.85rem;
	border-radius: 999px;
	border: 1px solid var(--border);
	background: var(--bg);
	box-shadow: 0 1px 8px color-mix(in srgb, var(--text) 10%, transparent);
	font-size: 0.75rem;
	color: var(--text-secondary);
	cursor: pointer;
	white-space: nowrap;
	max-width: min(440px, calc(100vw - 2.5rem));
	overflow: hidden;
	text-overflow: ellipsis;
	display: block;
	transition: background-color 0.15s ease;
}
.toc-pill:hover {
	background: color-mix(in srgb, var(--bg) 85%, var(--text));
}
.toc-widget.toc-expanded .toc-pill {
	background: color-mix(in srgb, var(--bg) 88%, var(--text));
}
.toc-panel {
	position: fixed;
	top: calc(4.75rem + 1.5rem + 0.75rem);
	right: max(2rem, calc(50% - 325px));
	width: min(380px, calc(100vw - 2.5rem));
	max-height: 0;
	overflow: hidden;
	transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.toc-widget.toc-expanded .toc-panel {
	max-height: 65vh;
}
.toc-panel-inner {
	overflow-y: auto;
	max-height: 65vh;
	background: var(--bg);
	border: 1px solid var(--border);
	border-radius: 10px;
	padding: 0.5rem 0 0.75rem;
}
.toc-list {
	list-style: none;
	padding: 0;
	margin: 0;
}
.toc-item {
	display: block;
}
.toc-link {
	display: block;
	padding: 0.3rem 1.25rem;
	padding-left: calc(1.25rem + var(--indent, 0) * 0.9rem);
	font-size: 0.78rem;
	color: var(--text-tertiary);
	text-decoration: none;
	line-height: 1.5;
	transition: color 0.1s ease, background-color 0.1s ease;
}
.toc-link:hover {
	color: var(--text);
	background: color-mix(in srgb, var(--text) 5%, transparent);
}
.toc-link.toc-current {
	color: var(--text);
	font-weight: 600;
}
@media (max-width: 768px) {
	.toc-widget {
		top: 3.5rem;
	}
	.toc-panel {
		top: calc(3.5rem + 1.5rem + 0.75rem);
	}
}
	`.trim();
	document.head.appendChild(style);
}

export function setupTOC(node: Element): () => void {
	injectStyles();

	const headingEls = Array.from(node.querySelectorAll<HTMLElement>('h2, h3, h4, h5, h6'));
	if (headingEls.length < 1) return () => {};

	headingEls.forEach((el, i) => {
		if (!el.id) el.id = `toc-h-${i}`;
	});

	const headings: Heading[] = headingEls.map((el) => ({
		el,
		level: parseInt(el.tagName[1]),
		text: el.textContent?.trim() ?? '',
		id: el.id,
	}));

	const minLevel = Math.min(...headings.map((h) => h.level));

	// --- DOM 구성 ---
	const widget = document.createElement('div');
	widget.className = 'toc-widget';
	document.body.appendChild(widget);

	const pill = document.createElement('button');
	pill.className = 'toc-pill';
	pill.textContent = '목차';
	pill.setAttribute('aria-expanded', 'false');
	widget.appendChild(pill);

	const panel = document.createElement('div');
	panel.className = 'toc-panel';
	panel.setAttribute('aria-hidden', 'true');
	widget.appendChild(panel);

	const panelInner = document.createElement('div');
	panelInner.className = 'toc-panel-inner';
	panel.appendChild(panelInner);

	const list = document.createElement('ul');
	list.className = 'toc-list';
	panelInner.appendChild(list);

	headings.forEach((h, idx) => {
		const li = document.createElement('li');
		li.className = 'toc-item';
		li.style.setProperty('--indent', String(h.level - minLevel));

		const a = document.createElement('a');
		a.href = `#${h.id}`;
		a.className = 'toc-link';
		a.dataset.idx = String(idx);
		a.textContent = h.text;

		a.addEventListener('click', (e) => {
			e.preventDefault();
			const sc = document.querySelector<HTMLElement>('.site-main .scrollable > *');
			if (sc) {
				const top = h.el.getBoundingClientRect().top + sc.scrollTop - 90;
				sc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
			} else {
				h.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
			collapse();
		});

		li.appendChild(a);
		list.appendChild(li);
	});

	// --- 상태 ---
	let isExpanded = false;
	let currentIdx = -1;

	function getAncestorSet(idx: number): Set<number> {
		const set = new Set<number>([idx]);
		let level = headings[idx].level;
		for (let i = idx - 1; i >= 0; i--) {
			if (headings[i].level < level) {
				set.add(i);
				level = headings[i].level;
			}
		}
		return set;
	}

	function getBreadcrumb(idx: number): string {
		const parts: string[] = [headings[idx].text];
		let level = headings[idx].level;
		for (let i = idx - 1; i >= 0; i--) {
			if (headings[i].level < level) {
				parts.unshift(headings[i].text);
				level = headings[i].level;
			}
		}
		return parts.join(' — ');
	}

	function updateHighlight() {
		const ancestors = currentIdx >= 0 ? getAncestorSet(currentIdx) : new Set<number>();
		list.querySelectorAll<HTMLAnchorElement>('.toc-link').forEach((a) => {
			const idx = parseInt(a.dataset.idx ?? '-1');
			a.classList.toggle('toc-current', ancestors.has(idx));
		});
	}

	function getPillText() {
		return currentIdx < 0 ? '목차' : getBreadcrumb(currentIdx);
	}

	function updateCurrentHeading() {
		const THRESHOLD = 200;
		let newIdx = -1;
		for (let i = 0; i < headings.length; i++) {
			if (headings[i].el.getBoundingClientRect().top < THRESHOLD) newIdx = i;
			else break;
		}

		if (newIdx === currentIdx) return;
		currentIdx = newIdx;

		// 펼쳐진 상태면 pill은 X 유지, 접힌 상태만 텍스트 갱신
		if (!isExpanded) pill.textContent = getPillText();

		if (isExpanded) updateHighlight();
	}

	function expand() {
		isExpanded = true;
		widget.classList.add('toc-expanded');
		pill.setAttribute('aria-expanded', 'true');
		panel.setAttribute('aria-hidden', 'false');
		pill.innerHTML = X_ICON;
		updateHighlight();
		setTimeout(() => {
			const currentLink = list.querySelector<HTMLElement>('.toc-link.toc-current');
			if (currentLink) panelInner.scrollTop = currentLink.offsetTop - panelInner.clientHeight / 2;
		}, 360);
	}

	function collapse() {
		isExpanded = false;
		widget.classList.remove('toc-expanded');
		pill.setAttribute('aria-expanded', 'false');
		panel.setAttribute('aria-hidden', 'true');
		pill.textContent = getPillText();
	}

	function handleOutsideClick(e: MouseEvent) {
		if (isExpanded && !widget.contains(e.target as Node)) {
			collapse();
		}
	}

	pill.addEventListener('click', () => (isExpanded ? collapse() : expand()));
	document.addEventListener('click', handleOutsideClick);

	const scrollEl = document.querySelector<HTMLElement>('.site-main .scrollable > *') ?? window;
	scrollEl.addEventListener('scroll', updateCurrentHeading, { passive: true });
	requestAnimationFrame(updateCurrentHeading);

	return () => {
		scrollEl.removeEventListener('scroll', updateCurrentHeading);
		document.removeEventListener('click', handleOutsideClick);
		widget.remove();
	};
}
