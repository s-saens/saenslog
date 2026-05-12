import { Table } from '@tiptap/extension-table/table';
import { mergeAttributes } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { ViewMutationRecord } from '@tiptap/pm/view';

function getColStyleDeclaration(
	minWidth: number,
	width: number | null | undefined
): [string, string] {
	if (width) {
		return ['width', `${Math.max(width, minWidth)}px`];
	}
	return ['min-width', `${minWidth}px`];
}

/** TipTap TableView의 `updateColumns`와 동일(비리사이즈 DOM) */
function updateColumns(
	node: PMNode,
	colgroup: HTMLTableColElement,
	table: HTMLTableElement,
	cellMinWidth: number,
	overrideCol?: number,
	overrideValue?: number | null
) {
	let totalWidth = 0;
	let fixedWidth = true;
	let nextDOM: ChildNode | null = colgroup.firstChild;
	const row = node.firstChild;
	if (row !== null) {
		for (let i = 0, col = 0; i < row.childCount; i += 1) {
			const cell = row.child(i);
			const colspan = cell.attrs.colspan as number;
			const colwidth = cell.attrs.colwidth as number[] | null | undefined;
			for (let j = 0; j < colspan; j += 1, col += 1) {
				const hasWidth =
					overrideCol === col ? overrideValue : colwidth && colwidth[j] != null ? colwidth[j] : null;
				const cssWidth = hasWidth ? `${hasWidth}px` : '';
				totalWidth += hasWidth ?? cellMinWidth;
				if (!hasWidth) {
					fixedWidth = false;
				}
				if (!nextDOM) {
					const colElement = document.createElement('col');
					const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth);
					colElement.style.setProperty(propertyKey, propertyValue);
					colgroup.appendChild(colElement);
				} else {
					if ((nextDOM as HTMLElement).style.width !== cssWidth) {
						const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth);
						(nextDOM as HTMLElement).style.setProperty(propertyKey, propertyValue);
					}
					nextDOM = nextDOM.nextSibling;
				}
			}
		}
	}
	while (nextDOM) {
		const after = nextDOM.nextSibling;
		nextDOM.parentNode?.removeChild(nextDOM);
		nextDOM = after;
	}
	const hasUserWidth =
		node.attrs.style &&
		typeof node.attrs.style === 'string' &&
		/\bwidth\s*:/i.test(node.attrs.style);
	if (fixedWidth && !hasUserWidth) {
		table.style.width = `${totalWidth}px`;
		table.style.minWidth = '';
	} else {
		table.style.width = '';
		table.style.minWidth = `${totalWidth}px`;
	}
}

function setTableStaticAttrs(
	tableEl: HTMLTableElement,
	HTMLAttributes: Record<string, unknown>
) {
	for (const [k0, v] of Object.entries(HTMLAttributes)) {
		if (v === null || v === undefined || v === false || k0 === 'style') continue;
		const k = k0 === 'className' ? 'class' : k0;
		tableEl.setAttribute(k, String(v));
	}
}

/**
 * 관리자 편집기 전용: 표 호버 시 삭제 버튼.
 * TableKit에서 `table: false`로 끈 뒤 이 확장만 등록한다.
 */
export const AdminTable = Table.extend({
	addNodeView() {
		return ({ node, editor, getPos, HTMLAttributes }) => {
			const cellMinWidth = this.options.cellMinWidth;

			const wrap = document.createElement('div');
			wrap.className = 'admin-editor-table-wrap';

			const del = document.createElement('button');
			del.type = 'button';
			del.className = 'admin-editor-table-del';
			del.setAttribute('aria-label', '표 삭제');
			del.textContent = '×';
			del.addEventListener('mousedown', (e) => {
				e.preventDefault();
				e.stopPropagation();
			});
			del.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				const pos = typeof getPos === 'function' ? getPos() : undefined;
				if (pos === undefined) return;
				editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
			});

			const tableEl = document.createElement('table');
			const merged = mergeAttributes(
				this.options.HTMLAttributes as Record<string, unknown>,
				HTMLAttributes as Record<string, unknown>
			) as Record<string, unknown>;
			setTableStaticAttrs(tableEl, merged);
			if (node.attrs.style && typeof node.attrs.style === 'string') {
				tableEl.style.cssText = node.attrs.style;
			}

			const colgroup = tableEl.appendChild(document.createElement('colgroup'));
			updateColumns(node, colgroup, tableEl, cellMinWidth);
			const tbody = tableEl.appendChild(document.createElement('tbody'));

			wrap.appendChild(del);
			wrap.appendChild(tableEl);

			return {
				dom: wrap,
				contentDOM: tbody,
				update: (updated: PMNode) => {
					if (updated.type !== node.type) return false;
					if (updated.attrs.style && typeof updated.attrs.style === 'string') {
						tableEl.style.cssText = updated.attrs.style;
					}
					updateColumns(updated, colgroup, tableEl, cellMinWidth);
					return true;
				},
				ignoreMutation(mutation: ViewMutationRecord) {
					if (mutation.type === 'selection') return false;
					const target = mutation.target;
					if (!wrap.contains(target)) return false;
					if (tbody.contains(target)) return false;
					if (
						mutation.type === 'attributes' ||
						mutation.type === 'childList' ||
						mutation.type === 'characterData'
					) {
						return true;
					}
					return false;
				}
			};
		};
	}
});
