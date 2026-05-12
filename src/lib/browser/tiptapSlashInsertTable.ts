import { Extension, InputRule } from '@tiptap/core';

const defaultInsert = () => ({
	rows: 3,
	cols: 3,
	withHeaderRow: true as const
});

/** `/표 ` 또는 `/table ` + 스페이스 시 표 삽입(노션 스타일). 표 삽입이 불가한 블록이면 무시. */
export const SlashInsertTable = Extension.create({
	name: 'slashInsertTable',

	addInputRules() {
		const opts = defaultInsert();
		return [
			new InputRule({
				find: /\/(?:표|table)\s$/i,
				handler: ({ range, chain, can }) => {
					if (!can().insertTable(opts)) return null;
					chain().focus().deleteRange(range).insertTable(opts).run();
				}
			})
		];
	}
});
