<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { setupCodeBlocks } from '$lib/actions/setupCodeBlocks';
	import { setupTables } from '$lib/actions/setupTables';
	import { setupTOC } from '$lib/actions/setupTOC';
	import { hrefAdminPostEdit, hrefBlogPathname } from '$lib/appPaths';
	import BlogAllPostsSection from '$lib/components/BlogAllPostsSection.svelte';
	import BlogListSection from '$lib/components/BlogListSection.svelte';
	import Comments from '$lib/components/Comments.svelte';
	import { PlusIcon, TextCountIcon } from '$lib/components/icons';
	import { MAIN_SCROLL_KEY, type MainScrollContext } from '$lib/scrollContext';
	import { readActionFailureMessage } from '$lib/formActionFailure';
	import { formatDate } from '$lib/utils/dateFormatter';
	import { fade, fly } from 'svelte/transition';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const mainScroll = getContext<MainScrollContext | undefined>(MAIN_SCROLL_KEY);

	const TRANSITION_DELAY = 70;

	let postContentEl: HTMLDivElement | undefined = $state();

	let addMenuOpen = $state(false);
	let newFolderModalOpen = $state(false);
	let newFolderName = $state('');
	let folderCreateError = $state<string | null>(null);
	let folderNameInputEl = $state<HTMLInputElement | undefined>();

	let moveModalOpen = $state(false);
	let moveTargetFolderId = $state('');
	let moveError = $state<string | null>(null);

	const adminNewPostHref = $derived(
		data.currentFolderId != null
			? `${resolve('/admin/posts/new')}?folder=${data.currentFolderId}`
			: resolve('/admin/posts/new')
	);

	function openNewFolderDialog() {
		addMenuOpen = false;
		folderCreateError = null;
		newFolderName = '';
		newFolderModalOpen = true;
	}

	function closeNewFolderModal() {
		newFolderModalOpen = false;
		folderCreateError = null;
	}

	function openMoveModal() {
		moveTargetFolderId =
			data.postFolderId != null && data.postFolderId !== 0 ? String(data.postFolderId) : '';
		moveError = null;
		moveModalOpen = true;
	}

	function closeMoveModal() {
		moveModalOpen = false;
		moveError = null;
	}

	$effect(() => {
		if (!browser || !newFolderModalOpen) return;
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeNewFolderModal();
		};
		window.addEventListener('keydown', esc);
		return () => window.removeEventListener('keydown', esc);
	});

	$effect(() => {
		if (!browser || !moveModalOpen) return;
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeMoveModal();
		};
		window.addEventListener('keydown', esc);
		return () => window.removeEventListener('keydown', esc);
	});

	$effect(() => {
		if (!browser || !newFolderModalOpen || !folderNameInputEl) return;
		queueMicrotask(() => folderNameInputEl?.focus());
	});

	$effect(() => {
		if (!browser || !data.isPost || !postContentEl) return;
		void data.content; // reactive dependency
		setupCodeBlocks(postContentEl);
		const cleanupTables = setupTables(postContentEl);
		const cleanupTOC = setupTOC(postContentEl, {
			getScrollRoot: () => mainScroll?.scrollRoot ?? null
		});
		return () => {
			cleanupTables?.();
			cleanupTOC?.();
		};
	});
</script>

<main>
	{#if browser}
		<div class="container" transition:fade|global={{ duration: 500 }}>
			<header>
				<div class="blog-path-bar">
					<nav class="breadcrumb">
						{#each data.breadcrumb as crumb, i (crumb.path || crumb.label || i)}
							{#if i > 0}
								<span class="separator">‣</span>
							{/if}
							{#if data.isPost}
								<a href={hrefBlogPathname(crumb.path)} class="crumb">{crumb.label}</a>
							{:else if i === data.breadcrumb.length - 1}
								<span class="crumb current">{crumb.label}</span>
							{:else}
								<a href={hrefBlogPathname(crumb.path)} class="crumb">{crumb.label}</a>
							{/if}
						{/each}
					</nav>
					{#if data.isAdmin && !data.isPost}
						<details class="breadcrumb-add-wrap" bind:open={addMenuOpen}>
							<summary class="breadcrumb-add-trigger" aria-label="추가" title="추가">
								<PlusIcon width={18} height={18} />
							</summary>
							<div class="breadcrumb-add-panel">
								<a class="breadcrumb-add-item" href={adminNewPostHref}>새 글</a>
								<button type="button" class="breadcrumb-add-item" onclick={openNewFolderDialog}>
									새 폴더
								</button>
							</div>
						</details>
					{/if}
				</div>
			</header>

			<div class="content-wrapper">
				{#if data.isPost}
					{#key data.title}
						<!-- 글 페이지 -->
						<article class="post" transition:fly|global={{ duration: 300, y: 100 }}>
							<div transition:fly|global={{ duration: 500, delay: 100 }}>
								<div class="title-row">
									<h1>{data.title || '제목 없음'}</h1>
								</div>
							</div>
							<div class="post-meta" transition:fly|global={{ duration: 400, y: 100, delay: 150 }}>
								{#if data.published && data.updated && data.published !== data.updated}
									<span class="date published">{formatDate(data.published)}</span>
									<span class="separator">|</span>
								{/if}
								<span class="date">{formatDate(data.updated ?? data.published ?? '')}</span>
								<span class="separator">•</span>
								<span class="word-count">
									<TextCountIcon width={14} height={14} />
									{data.wordCount}
								</span>
								{#if data.isAdmin && data.postId != null}
									<div class="post-admin-actions">
										<button type="button" class="post-admin-link" onclick={openMoveModal}>
											이동
										</button>
										<a class="post-admin-link" href={hrefAdminPostEdit(data.postId)}>수정</a>
										<form
											class="post-admin-delete"
											method="POST"
											action="?/deletePost"
											use:enhance={({ cancel }) => {
												if (!confirm('이 글을 삭제할까요?')) cancel();
											}}
										>
											<input type="hidden" name="post_id" value={String(data.postId)} />
											<button type="submit" class="post-admin-link danger">삭제</button>
										</form>
									</div>
								{/if}
							</div>
							<div
								class="content"
								lang="en"
								bind:this={postContentEl}
								transition:fly|global={{ duration: 600, y: 100, delay: 200 }}
							>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -- 마크다운 렌더 결과(저장소·관리자만 편집) -->
								{@html data.content}
							</div>
							{#if data.postId != null}
								<Comments
									postSlug={String(data.postId)}
									initialComments={data.comments}
									currentUserId={data.user?.id ?? null}
								/>
							{/if}
							<div class="footer"></div>
						</article>
					{/key}
				{:else}
					{#key $page.url.pathname}
						<!-- 카테고리 페이지 -->
						<div class="list-wrapper">
							<BlogListSection
								folders={data.folders}
								posts={data.posts}
								transitionDelay={TRANSITION_DELAY}
							/>
							{#if data.path === ''}
								{#await data.allPosts}
									<section
										class="all-posts-pending"
										aria-busy="true"
										aria-label="전체 글 목록 로드 중"
									>
										<div class="all-posts-spinner"></div>
										<span class="all-posts-pending-text">All Posts 로딩 중…</span>
									</section>
								{:then allPosts}
									<BlogAllPostsSection
										allPosts={allPosts ?? []}
										folderCount={data.folders?.length || 0}
										postCount={data.posts?.length || 0}
										transitionDelay={TRANSITION_DELAY}
									/>
								{:catch}
									<section class="all-posts-error">
										<span>목록을 불러오지 못했습니다.</span>
									</section>
								{/await}
							{/if}
						</div>
					{/key}
				{/if}
			</div>
		</div>
		{#if newFolderModalOpen}
			<button
				type="button"
				class="folder-modal-backdrop"
				onclick={closeNewFolderModal}
				aria-label="닫기"
			></button>
			<div class="folder-modal" role="dialog" aria-modal="true" aria-labelledby="new-folder-title">
				<h2 id="new-folder-title" class="folder-modal-title">새 폴더</h2>
				<form
					method="POST"
					action="?/createFolder"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'failure') {
								folderCreateError = readActionFailureMessage(
									result.data,
									'폴더를 만들 수 없습니다.'
								);
								await update({ reset: false });
								return;
							}
							closeNewFolderModal();
							await update();
						};
					}}
				>
					<input
						type="hidden"
						name="parent_folder_id"
						value={data.currentFolderId != null ? String(data.currentFolderId) : ''}
					/>
					<label class="folder-modal-label" for="new-folder-name-input">폴더 이름</label>
					<input
						id="new-folder-name-input"
						name="name"
						class="folder-modal-input"
						bind:this={folderNameInputEl}
						bind:value={newFolderName}
						autocomplete="off"
						maxlength="160"
						required
					/>
					{#if folderCreateError}
						<p class="folder-modal-error" role="alert">{folderCreateError}</p>
					{/if}
					<div class="folder-modal-actions">
						<button type="button" class="folder-modal-btn secondary" onclick={closeNewFolderModal}>
							취소
						</button>
						<button type="submit" class="folder-modal-btn primary">확인</button>
					</div>
				</form>
			</div>
		{/if}
		{#if moveModalOpen}
			<button type="button" class="folder-modal-backdrop" onclick={closeMoveModal} aria-label="닫기"
			></button>
			<div
				class="folder-modal folder-move-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="move-post-title"
			>
				<h2 id="move-post-title" class="folder-modal-title">글 위치 이동</h2>
				<form
					method="POST"
					action="?/movePost"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'failure') {
								moveError = readActionFailureMessage(result.data, '글을 이동하지 못했습니다.');
								await update({ reset: false });
								return;
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="post_id" value={String(data.postId)} />
					<fieldset class="folder-move-fieldset">
						<legend class="folder-move-legend">대상 폴더</legend>
						<div class="folder-move-scroll">
							<label class="folder-move-option">
								<input
									type="radio"
									name="target_folder_id"
									bind:group={moveTargetFolderId}
									value=""
								/>
								<span>블로그 루트 (/blog)</span>
							</label>
							{#each data.folderMoveTargets as row (row.id)}
								<label class="folder-move-option">
									<input
										type="radio"
										name="target_folder_id"
										bind:group={moveTargetFolderId}
										value={String(row.id)}
									/>
									<span>{row.pathLabel}</span>
								</label>
							{/each}
						</div>
					</fieldset>
					{#if moveError}
						<p class="folder-modal-error" role="alert">{moveError}</p>
					{/if}
					<div class="folder-modal-actions">
						<button type="button" class="folder-modal-btn secondary" onclick={closeMoveModal}>
							취소
						</button>
						<button type="submit" class="folder-modal-btn primary">확인</button>
					</div>
				</form>
			</div>
		{/if}
	{/if}
</main>

<style>
	main {
		width: 100%;
		padding: 5.25rem 2rem 0;
		display: flex;
		justify-content: center;
	}

	.container {
		width: 100%;
		max-width: 650px;
		height: auto;
		display: flex;
		flex-direction: column;
		overflow-y: visible;
		scrollbar-gutter: stable; /* 지원 브라우저에서 레이아웃 흔들림 방지 */
		padding: 0 20px 5.25rem;
		gap: 1rem;
	}

	.content-wrapper {
		position: relative;
		width: 100%;
		min-height: 50vh;
	}

	.post,
	.list-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
	}

	.list-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 5rem;
	}

	.all-posts-pending {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 0;
		gap: 0.75rem;
		color: var(--text-tertiary);
	}

	.all-posts-spinner {
		width: 26px;
		height: 26px;
		border: 2px solid color-mix(in srgb, var(--text) 20%, transparent);
		border-top-color: var(--text);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.all-posts-pending-text {
		font-size: 0.85rem;
	}

	header {
		padding-bottom: 0.75rem;
		margin-bottom: 0.2rem;
	}

	.blog-path-bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem 0.55rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}

	.crumb {
		color: var(--text);
		transition: opacity 0.2s;
	}

	a.crumb {
		text-decoration: underline;
	}

	a.crumb:hover {
		opacity: 0.6;
	}

	.breadcrumb-add-wrap {
		position: relative;
		display: inline-flex;
		flex-shrink: 0;
		margin-left: 0.1rem;
	}

	.breadcrumb-add-wrap summary {
		list-style: none;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.breadcrumb-add-wrap summary::-webkit-details-marker {
		display: none;
	}

	.breadcrumb-add-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0.15rem;
		color: var(--text-secondary);
		border-radius: 6px;
		transition:
			color 0.15s ease,
			background-color 0.15s ease,
			opacity 0.15s ease;
	}

	.breadcrumb-add-trigger:hover {
		color: var(--text);
		background-color: color-mix(in srgb, var(--text) 8%, transparent);
	}

	.breadcrumb-add-panel {
		position: absolute;
		top: calc(100% + 0.28rem);
		right: 0;
		z-index: 30;
		min-width: 10rem;
		padding: 0.35rem 0;
		display: flex;
		flex-direction: column;
		gap: 0;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow:
			0 6px 20px color-mix(in srgb, var(--text) 12%, transparent),
			0 1px 2px color-mix(in srgb, var(--text) 8%, transparent);
	}

	.breadcrumb-add-item {
		display: block;
		width: 100%;
		padding: 0.52rem 0.85rem;
		text-align: left;
		font: inherit;
		font-size: 0.9rem;
		color: var(--text);
		text-decoration: none;
		background: none;
		border: none;
		cursor: pointer;
		transition: background-color 0.12s ease;
	}

	a.breadcrumb-add-item:hover,
	button.breadcrumb-add-item:hover {
		background-color: color-mix(in srgb, var(--text) 7%, transparent);
	}

	.folder-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 90;
		margin: 0;
		padding: 0;
		border: none;
		cursor: pointer;
		background: color-mix(in srgb, var(--text) 35%, transparent);
	}

	.folder-modal {
		position: fixed;
		left: 50%;
		top: 50%;
		z-index: 91;
		width: min(92vw, 22rem);
		transform: translate(-50%, -50%);
		padding: 1.1rem 1.15rem 1rem;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--bg);
		box-shadow:
			0 18px 44px color-mix(in srgb, var(--text) 18%, transparent),
			0 2px 8px color-mix(in srgb, var(--text) 10%, transparent);
	}

	.folder-modal-title {
		margin: 0 0 0.85rem;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.folder-modal-label {
		display: block;
		font-size: 0.82rem;
		color: var(--text-secondary);
		margin-bottom: 0.35rem;
	}

	.folder-modal-input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.55rem 0.65rem;
		font: inherit;
		font-size: 0.92rem;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
	}

	.folder-modal-error {
		margin: 0.55rem 0 0;
		font-size: 0.82rem;
		color: #f87171;
	}

	.folder-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.45rem;
		margin-top: 1rem;
	}

	.folder-modal-btn {
		font: inherit;
		font-size: 0.88rem;
		padding: 0.45rem 0.75rem;
		border-radius: 8px;
		cursor: pointer;
		border: 1px solid var(--border);
		transition:
			background-color 0.12s ease,
			color 0.12s ease;
	}

	.folder-modal-btn.secondary {
		background: transparent;
		color: var(--text-secondary);
	}

	.folder-modal-btn.secondary:hover {
		background: color-mix(in srgb, var(--text) 7%, transparent);
		color: var(--text);
	}

	.folder-modal-btn.primary {
		background: color-mix(in srgb, var(--text) 88%, var(--bg));
		color: var(--bg);
		border-color: transparent;
	}

	.folder-modal-btn.primary:hover {
		opacity: 0.92;
	}

	.folder-move-modal {
		width: min(92vw, 26rem);
	}

	.folder-move-fieldset {
		border: none;
		margin: 0;
		padding: 0;
		min-width: 0;
	}

	.folder-move-legend {
		padding: 0;
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--text-secondary);
		margin-bottom: 0.45rem;
	}

	.folder-move-scroll {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		max-height: min(42vh, 16rem);
		overflow-y: auto;
		padding: 0.25rem 0;
		margin: 0 0 0.35rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: color-mix(in srgb, var(--text) 4%, transparent);
	}

	.folder-move-option {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		padding: 0.42rem 0.65rem;
		cursor: pointer;
		font-size: 0.88rem;
		line-height: 1.35;
		color: var(--text);
		transition: background-color 0.12s ease;
	}

	.folder-move-option:hover {
		background: color-mix(in srgb, var(--text) 8%, transparent);
	}

	.folder-move-option input {
		margin-top: 0.2rem;
		flex-shrink: 0;
	}

	.crumb.current {
		font-weight: 700;
		text-decoration: none;
	}

	.separator {
		color: var(--text-tertiary);
		font-size: 0.8rem;
	}

	/* 글 페이지 */
	.post {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		font-family: var(--font-default);
		padding-bottom: 5rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.post h1 {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
		margin-bottom: -0.5rem;
	}

	.post-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.5rem;
		font-size: 0.8rem;
		color: var(--text-tertiary);
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.date.published {
		opacity: 0.8;
	}

	.date:not(.published) {
		font-weight: 500;
	}

	.post-admin-actions {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.post-admin-link {
		font: inherit;
		font-size: 0.78rem;
		color: var(--text-secondary);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
	}

	.post-admin-link:hover {
		color: var(--text);
	}

	.post-admin-link.danger {
		color: #f87171;
	}

	.post-admin-delete {
		margin: 0;
		padding: 0;
		display: inline;
	}

	.post-meta .separator {
		color: var(--text-tertiary);
	}

	.word-count {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.word-count :global(svg) {
		width: 14px;
		height: 14px;
	}

	.post .content {
		line-height: 1.8;
		user-select: text;
		-webkit-user-select: text;
		overflow-wrap: break-word;
	}

	/* 마크다운 콘텐츠 스타일 */
	.post .content :global(img) {
		max-height: 40vh;
		max-width: 100%;
		width: auto;
		height: auto;
		display: block;
		margin: 0 auto;
		border-radius: 10px;
		filter: var(--img-filter);
		transition: filter 0.3s ease;
	}

	.post .content :global(img.no-invert) {
		filter: none;
	}

	.post .content :global(figure.post-image-figure) {
		margin: 1rem auto;
		max-width: 100%;
	}

	.post .content :global(figure.post-image-figure figcaption) {
		margin-top: 0.45rem;
		text-align: center;
		font-size: 0.82rem;
		line-height: 1.35;
		color: var(--text-secondary);
		font-family: var(--font-default);
	}

	:global([data-theme='dark']) .post .content :global(img[data-image-color-mode='light']) {
		filter: invert(1) hue-rotate(180deg);
	}

	:global([data-theme='light']) .post .content :global(img[data-image-color-mode='dark']) {
		filter: invert(1) hue-rotate(180deg);
	}

	.post .content :global(p) {
		margin: 1rem 0;
		font-family: var(--font-default);
		font-size: 0.95rem;
		font-weight: 400;
		color: var(--text-secondary);
		text-align: justify;
		overflow-wrap: break-word;
		hyphens: auto;
		-webkit-hyphens: auto;
	}

	.post .content :global(h1),
	.post .content :global(h2),
	.post .content :global(h3) {
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	/* 인라인 코드 */
	.post .content :global(code) {
		font-family: var(--font-mono);
		font-size: 0.85em;
		padding: 0.15em 0.45em;
		border-radius: 5px;
		background-color: color-mix(in srgb, var(--text) 8%, var(--bg));
		border: 1px solid var(--border);
		color: var(--text-secondary);
		word-break: break-all;
		overflow-wrap: break-word;
	}

	/* 코드블럭 (hydration 후 .code-block-shell로 감쌈) */
	.post .content :global(pre) {
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--border);
		background: var(--code-bg) !important;
	}

	.post .content > :global(pre) {
		margin: 1.5rem 0;
	}

	.post .content :global(.code-block-shell) {
		position: relative;
		margin: 1.5rem 0;
	}

	.post .content :global(.code-block-shell pre) {
		margin: 0;
	}

	.post .content :global(.code-pre-wrap) {
		position: relative;
	}

	/* 복사: 코드 영역 오른쪽 세로 중앙 (pre 내부 스크롤과 무관) */
	.post .content :global(.code-copy-track) {
		position: absolute;
		top: 50%;
		right: -0.05rem;
		transform: translateY(-50%);
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		pointer-events: none;
	}

	.post .content :global(.code-pre-wrap pre code),
	.post .content :global(.code-block-shell > pre code) {
		padding-right: 2.75rem;
	}

	.post .content :global(.code-copy-btn) {
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
		border-radius: 9px 0 0 9px;
		background: color-mix(in srgb, var(--bg) 22%, transparent);
		backdrop-filter: blur(1px) saturate(150%);
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			color 0.18s ease,
			background-color 0.18s ease,
			border-color 0.18s ease;
	}

	.post .content :global(.code-copy-btn:hover) {
		color: var(--text);
		background: color-mix(in srgb, var(--bg) 58%, transparent);
		border-color: color-mix(in srgb, var(--border) 75%, var(--text));
	}

	.post .content :global(.code-copy-btn:active) {
		transform: translateY(0);
	}

	.post .content :global(.code-copy-btn.copied) {
		color: var(--text-secondary);
	}

	.post .content :global(.code-copy-btn svg) {
		display: block;
	}

	.post .content :global(pre code) {
		display: block;
		padding: 1.1rem 1.25rem;
		overflow-x: auto;
		background: none !important;
		border: none;
		font-size: 0.82rem;
		line-height: 1.7;
		color: inherit;
	}

	/* 코드블럭 접기/펴기 wrapper */
	.post .content :global(.code-collapse-wrapper) {
		position: relative;
		margin: 1.5rem 0;
		border-radius: 10px 10px 0 0;
		border: 1px solid var(--border);
		background: var(--code-bg);
		/* overflow: hidden 제거 — sticky button 작동을 위해 */
	}

	.post .content :global(.code-block-shell .code-collapse-wrapper) {
		margin: 0;
	}

	.post .content :global(.code-collapse-wrapper pre) {
		margin: 0;
		border-radius: 10px 10px 0 0;
		border: none;
		background: transparent !important;
		overflow: hidden; /* pre 자체 content 클리핑용 */
	}

	.post .content :global(.code-collapse-wrapper.collapsed pre) {
		max-height: calc(12 * 0.82rem * 1.7 + 2.2rem);
		overflow-y: auto;
	}

	.post .content :global(.code-collapse-wrapper.expanded pre) {
		max-height: none;
		overflow-y: visible;
	}

	/* 접기/펴기 버튼 */
	.post .content :global(.code-collapse-btn) {
		position: sticky;
		bottom: 0;
		z-index: 2;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem 0;
		background: var(--code-bg);
		border: none;
		border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
		border-radius: 10px 10px 0 0;
		cursor: pointer;
		color: var(--text-tertiary);
		transition:
			color 0.2s ease,
			background-color 0.2s ease;
	}

	.post .content :global(.code-collapse-btn:hover) {
		color: var(--text-secondary);
		background: color-mix(in srgb, var(--code-bg) 85%, var(--text));
	}

	.post .content :global(.code-collapse-btn svg) {
		display: block;
		transition: transform 0.3s ease;
	}

	.post .content :global(.code-collapse-wrapper.expanded .code-collapse-btn svg) {
		transform: rotate(180deg);
	}

	/* 표 */
	.post .content :global(.table-container) {
		position: relative;
		margin: 1.5rem 0;
	}

	.post .content :global(.table-wrapper) {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.post .content :global(table) {
		width: max-content;
		min-width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		border: 1px solid var(--border);
		white-space: nowrap;
	}

	/* 이미지가 있는 표는 width 100%, 스크롤 없음 */
	.post .content :global(table:has(img)) {
		width: 100%;
		white-space: normal;
	}

	.post .content :global(.table-wrapper:has(img)) {
		overflow-x: clip;
	}

	.post .content :global(thead) {
		background-color: color-mix(in srgb, var(--text) 6%, var(--bg));
	}

	.post .content :global(th) {
		padding: 0.65rem 0.9rem;
		text-align: center;
		font-weight: 600;
		color: var(--text);
		border: 1px solid var(--border);
		font-size: 0.82rem;
		letter-spacing: 0.02em;
	}

	.post .content :global(td) {
		padding: 0.55rem 0.9rem;
		text-align: center;
		color: var(--text-secondary);
		border: 1px solid var(--border);
		vertical-align: middle;
		background-color: transparent;
	}

	.post .content :global(td:has(> img)),
	.post .content :global(th:has(> img)),
	.post .content :global(td:has(> figure.post-image-figure)),
	.post .content :global(th:has(> figure.post-image-figure)) {
		padding: 0;
		overflow: hidden;
	}

	.post .content :global(td figure.post-image-figure),
	.post .content :global(th figure.post-image-figure) {
		margin: 0;
		max-width: 100%;
	}

	.post .content :global(td figure.post-image-figure figcaption),
	.post .content :global(th figure.post-image-figure figcaption) {
		font-size: 0.75rem;
		padding: 0.35rem 0.5rem 0.45rem;
	}

	.post .content :global(td img),
	.post .content :global(th img) {
		max-height: none;
		width: 100%;
		height: auto;
		border-radius: 0;
		display: block;
		margin: 0;
	}

	/* 표 스크롤 화살표 버튼 */
	.post .content :global(.table-scroll-btn) {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text-secondary);
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.2s ease,
			background-color 0.15s ease;
		box-shadow: 0 1px 4px color-mix(in srgb, var(--text) 12%, transparent);
	}

	.post .content :global(.table-scroll-btn.visible) {
		opacity: 1;
		pointer-events: auto;
	}

	.post .content :global(.table-scroll-btn:hover) {
		background: color-mix(in srgb, var(--bg) 80%, var(--text));
	}

	.post .content :global(.table-scroll-left) {
		left: 0;
	}

	.post .content :global(.table-scroll-right) {
		right: 0;
	}

	.post .content :global(hr) {
		border: none;
		border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
		margin: 1.5rem 0;
	}

	.post .content :global(blockquote) {
		border-left: 3px solid var(--text-tertiary);
		margin: 1rem 0;
		padding-left: 1rem;
		color: var(--text-secondary);
	}

	.post .content :global(ul),
	.post .content :global(ol) {
		padding-left: 1.5rem;
		margin: 0.2rem 0;
	}

	.post .content :global(li) {
		font-family: var(--font-default);
		font-size: 0.95rem;
		font-weight: 400;
		color: var(--text-secondary);
		overflow-wrap: break-word;
		hyphens: auto;
		-webkit-hyphens: auto;
		margin: 0.2rem, 0;
	}

	.post .content :global(li > p) {
		margin: 0.2rem 0;
	}

	.post .content :global(a) {
		color: var(--text);
		text-decoration: underline;
	}

	.post .content :global(a:hover) {
		opacity: 0.7;
	}

	@media (max-width: 768px) {
		main {
			padding: 4rem 1rem 0;
		}

		.container {
			padding-bottom: 1rem;
		}
	}
</style>
