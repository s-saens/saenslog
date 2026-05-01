<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
</script>

<svelte:head>
	<title>계정 | SAENS</title>
</svelte:head>

<main class="account">
	<h1 class="title">계정</h1>

	<section class="panel">
		<dl class="rows">
			<div class="row">
				<dt>표시 이름</dt>
				<dd>{data.profile?.display_name ?? data.profile?.username ?? '—'}</dd>
			</div>
			<div class="row">
				<dt>사용자 이름</dt>
				<dd>{data.profile?.username ?? '아직 없음'}</dd>
			</div>
			<div class="row">
				<dt>이메일</dt>
				<dd>{data.user?.email ?? '—'}</dd>
			</div>
			<div class="row">
				<dt>역할</dt>
				<dd>{data.profile?.role === 'admin' ? '관리자' : '회원'}</dd>
			</div>
		</dl>
	</section>

	<form class="logout" method="POST" action="/logout" use:enhance>
		<button type="submit" class="btn-out">로그아웃</button>
	</form>
</main>

<style>
	.account {
		padding: calc(var(--site-header-height) + 1.5rem) 1.5rem 3rem;
		max-width: 32rem;
		margin: 0 auto;
	}

	.title {
		margin: 0 0 1.25rem;
		font-size: 1.35rem;
		font-weight: 600;
		color: var(--text);
	}

	.panel {
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.25rem 1.35rem;
		background: color-mix(in srgb, var(--bg-lighter) 88%, transparent);
	}

	.rows {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.row {
		display: grid;
		grid-template-columns: 7rem 1fr;
		gap: 0.75rem;
		align-items: baseline;
		font-size: 0.88rem;
	}

	.row dt {
		margin: 0;
		color: var(--text-tertiary);
	}

	.row dd {
		margin: 0;
		color: var(--text);
		word-break: break-all;
	}

	.logout {
		margin-top: 1.5rem;
	}

	.btn-out {
		font: inherit;
		font-size: 0.88rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.btn-out:hover {
		color: var(--text);
		border-color: var(--text-tertiary);
	}

	@media (max-width: 480px) {
		.row {
			grid-template-columns: 1fr;
		}
	}
</style>
