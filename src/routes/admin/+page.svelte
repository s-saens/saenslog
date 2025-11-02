<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	
	let isAuthenticated = $state(false);
	let password = $state('');
	let error = $state('');
	
	onMount(() => {
		// 세션 확인
		const session = sessionStorage.getItem('admin_session');
		if (session) {
			isAuthenticated = true;
		}
	});
	
	async function login() {
		error = '';
		try {
			const response = await fetch('/admin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password }),
				credentials: 'include'
			});
			
			if (response.ok) {
				const data = await response.json();
				sessionStorage.setItem('admin_session', data.token);
				isAuthenticated = true;
				password = '';
			} else {
				error = '비밀번호가 올바르지 않습니다.';
			}
		} catch (err) {
			error = '로그인 중 오류가 발생했습니다.';
		}
	}
	
	function logout() {
		sessionStorage.removeItem('admin_session');
		isAuthenticated = false;
		goto('/admin');
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			login();
		}
	}
</script>

<svelte:head>
	<title>Admin - Saenslog</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-3xl mx-auto">
		{#if !isAuthenticated}
			<div class="bg-white shadow-md rounded-lg p-8">
				<h1 class="text-2xl font-bold text-gray-900 mb-6">관리자 로그인</h1>
				
				{#if error}
					<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
						{error}
					</div>
				{/if}
				
				<form onsubmit={(e) => { e.preventDefault(); login(); }}>
					<div class="mb-4">
						<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
							비밀번호
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							onkeydown={handleKeydown}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
							placeholder="비밀번호를 입력하세요"
							autocomplete="off"
						/>
					</div>
					
					<button
						type="submit"
						class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						로그인
					</button>
				</form>
			</div>
		{:else}
			<div class="space-y-4">
				<div class="flex justify-between items-center bg-white shadow-md rounded-lg p-6">
					<h1 class="text-2xl font-bold text-gray-900">블로그 관리</h1>
					<button
						onclick={logout}
						class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
					>
						로그아웃
					</button>
				</div>
				
				<Editor />
			</div>
		{/if}
	</div>
</div>

<script>
	import Editor from './Editor.svelte';
</script>

