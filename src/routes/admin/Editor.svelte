<script lang="ts">
	import type { BlogPost } from '$lib/blog';
	
	let title = $state('');
	let tag = $state('');
	let description = $state('');
	let body = $state('');
	let number = $state(1);
	let published = $state(true);
	let saving = $state(false);
	let message = $state('');
	
	let textarea: HTMLTextAreaElement;
	
	async function loadNextNumber() {
		if (tag) {
			const nextNum = await fetch(`/admin/api/next-number?tag=${encodeURIComponent(tag)}`, {
				credentials: 'include'
			})
				.then((r) => r.json())
				.then((d) => d.number)
				.catch(() => 1);
			number = nextNum;
		}
	}
	
	$effect(() => {
		if (tag) {
			loadNextNumber();
		}
	});
	
	async function handleSave() {
		if (!title || !tag || !body) {
			message = '제목, 태그, 본문을 모두 입력해주세요.';
			return;
		}
		
		saving = true;
		message = '';
		
		try {
			const post: BlogPost = {
				tag,
				number,
				title,
				description,
				date: new Date().toISOString(),
				body,
				published
			};
			
			const response = await fetch('/admin/api/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(post),
				credentials: 'include'
			});
			
			if (response.ok) {
				message = '저장되었습니다!';
				// 폼 초기화
				title = '';
				tag = '';
				description = '';
				body = '';
				number = 1;
				published = true;
			} else {
				message = '저장 중 오류가 발생했습니다.';
			}
		} catch (error) {
			message = '저장 중 오류가 발생했습니다.';
		} finally {
			saving = false;
		}
	}
	
	async function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;
		
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.type.indexOf('image') !== -1) {
				e.preventDefault();
				
				const file = item.getAsFile();
				if (!file) continue;
				
				const formData = new FormData();
				formData.append('image', file);
				
				try {
					const response = await fetch('/admin/api/upload-image', {
						method: 'POST',
						body: formData,
						credentials: 'include'
					});
					
					if (response.ok) {
						const data = await response.json();
						const imageUrl = data.url;
						
						// 커서 위치에 이미지 삽입
						const cursorPos = textarea.selectionStart;
						const textBefore = body.substring(0, cursorPos);
						const textAfter = body.substring(cursorPos);
						
						const imageMarkdown = `\n![${file.name}](${imageUrl})\n`;
						body = textBefore + imageMarkdown + textAfter;
						
						// 커서 위치 조정
						setTimeout(() => {
							textarea.focus();
							const newPos = cursorPos + imageMarkdown.length;
							textarea.setSelectionRange(newPos, newPos);
						}, 0);
					}
				} catch (error) {
					console.error('이미지 업로드 실패:', error);
				}
			}
		}
	}
</script>

<div class="bg-white shadow-md rounded-lg p-6 space-y-4">
	<h2 class="text-xl font-bold text-gray-900 mb-4">새 글 작성</h2>
	
	{#if message}
		<div class="p-3 rounded {message.includes('저장되었습니다') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}">
			{message}
		</div>
	{/if}
	
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">태그 *</label>
		<input
			type="text"
			bind:value={tag}
			class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
			placeholder="예: react, javascript"
			required
		/>
	</div>
	
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">글번호</label>
		<input
			type="number"
			bind:value={number}
			min="1"
			class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
		/>
		<p class="text-xs text-gray-500 mt-1">태그당 자동 증가하는 번호입니다.</p>
	</div>
	
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
		<input
			type="text"
			bind:value={title}
			class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
			placeholder="글 제목을 입력하세요"
			required
		/>
	</div>
	
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">설명</label>
		<textarea
			bind:value={description}
			rows="2"
			class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
			placeholder="SEO용 설명 (선택사항)"
		></textarea>
	</div>
	
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">본문 (마크다운) *</label>
		<textarea
			bind:this={textarea}
			bind:value={body}
			onpaste={handlePaste}
			rows="20"
			class="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
			placeholder="마크다운 형식으로 글을 작성하세요. Ctrl+V로 이미지를 붙여넣을 수 있습니다."
			required
		></textarea>
	</div>
	
	<div class="flex items-center">
		<input
			type="checkbox"
			bind:checked={published}
			id="published"
			class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
		/>
		<label for="published" class="ml-2 block text-sm text-gray-700">
			발행하기
		</label>
	</div>
	
	<button
		onclick={handleSave}
		disabled={saving}
		class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{saving ? '저장 중...' : '저장하기'}
	</button>
</div>

