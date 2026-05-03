import { mergeAttributes, Node } from '@tiptap/core';

/** 블로그 본문에 쓰는 <audio controls> 블록 */
export const AudioBlock = Node.create({
	name: 'audioBlock',
	group: 'block',
	atom: true,
	selectable: true,
	draggable: true,

	addAttributes() {
		return {
			src: { default: null }
		};
	},

	parseHTML() {
		return [{ tag: 'audio[controls]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'audio',
			mergeAttributes(HTMLAttributes, {
				controls: '',
				preload: 'metadata'
			})
		];
	}
});
