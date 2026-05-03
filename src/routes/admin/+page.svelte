<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>관리 | SAENS</title>
</svelte:head>

<main class="admin">
	<h1 class="title">관리</h1>
	<p class="lead">글 작성·수정은 다음 단계에서 여기에 연결됩니다.</p>
	<p class="hint">
		<a class="link" href={resolve('/admin/posts')}>블로그 글 관리</a>
		·
		<a class="link" href={resolve('/account')}>계정</a>
		·
		<a class="link" href={resolve('/')}>홈</a>
	</p>
</main>

<style>
	.admin {
		padding: calc(var(--site-header-height) + 1.5rem) 1.5rem 3rem;
		max-width: 36rem;
		margin: 0 auto;
	}

	.title {
		margin: 0 0 0.75rem;
		font-size: 1.35rem;
		font-weight: 600;
		color: var(--text);
	}

	.lead {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.hint {
		margin: 1.25rem 0 0;
		font-size: 0.85rem;
		color: var(--text-tertiary);
	}

	.link {
		color: var(--text-secondary);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.link:hover {
		color: var(--text);
	}
</style>
