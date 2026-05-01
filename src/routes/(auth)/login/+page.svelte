<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>로그인 | SAENS</title>
</svelte:head>

<h1 class="title">로그인</h1>

{#if data.urlError}
	<p class="msg err" role="alert">{data.urlError}</p>
{/if}

{#if form?.message}
	<p class="msg err" role="alert">{form.message}</p>
{/if}

<form class="form" method="POST" use:enhance>
	<input type="hidden" name="next" value={data.next} />

	<label class="field">
		<span class="label">이메일</span>
		<input
			class="input"
			type="email"
			name="email"
			required
			autocomplete="email"
			value={form?.email ?? ''}
		/>
	</label>

	<label class="field">
		<span class="label">비밀번호</span>
		<input class="input" type="password" name="password" required autocomplete="current-password" />
	</label>

	<button class="submit" type="submit">로그인</button>
</form>

<p class="footer">
	<a class="link" href="/signup">계정이 없으면 회원가입</a>
</p>

<style>
	.title {
		margin: 0 0 1.25rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text);
	}

	.msg {
		margin: 0 0 1rem;
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.msg.err {
		color: #f87171;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.label {
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	.input {
		font: inherit;
		font-size: 0.9rem;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
	}

	.input:focus {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}

	.submit {
		margin-top: 0.25rem;
		font: inherit;
		font-size: 0.9rem;
		padding: 0.6rem 1rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--accent);
		color: var(--bg);
		cursor: pointer;
	}

	.submit:hover {
		opacity: 0.92;
	}

	.footer {
		margin: 1.25rem 0 0;
		font-size: 0.82rem;
		text-align: center;
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
