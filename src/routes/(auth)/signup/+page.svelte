<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>회원가입 | SAENS</title>
</svelte:head>

<h1 class="title">회원가입</h1>

{#if form && 'message' in form && form.message}
	<p class="msg err" role="alert">{form.message}</p>
{/if}

{#if form && 'needsConfirmation' in form && form.needsConfirmation}
	<p class="msg ok" role="status">
		<strong>{form.email}</strong>으로 확인 메일을 보냈습니다. 메일의 링크를 눌러 가입을 마쳐 주세요.
	</p>
{:else}
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
				value={form && 'email' in form ? (form.email ?? '') : ''}
			/>
		</label>

		<label class="field">
			<span class="label">비밀번호 (8자 이상)</span>
			<input class="input" type="password" name="password" required autocomplete="new-password" />
		</label>

		<label class="field">
			<span class="label">비밀번호 확인</span>
			<input
				class="input"
				type="password"
				name="passwordConfirm"
				required
				autocomplete="new-password"
			/>
		</label>

		<button class="submit" type="submit">가입하기</button>
	</form>
{/if}

<p class="footer">
	<a class="link" href={resolve('/login')}>이미 계정이 있으면 로그인</a>
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
		line-height: 1.5;
	}

	.msg.err {
		color: #f87171;
	}

	.msg.ok {
		color: var(--text-secondary);
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
