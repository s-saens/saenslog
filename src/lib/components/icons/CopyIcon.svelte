<script lang="ts">
	let {
		color = 'var(--text)',
		width = 24,
		height = 24,
		class: className = ''
	}: {
		color?: string;
		width?: number;
		height?: number;
		class?: string;
	} = $props();
</script>

<svg
	{width}
	{height}
	viewBox="0 0 24 24"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
>
	<rect
		x="9"
		y="9"
		width="11"
		height="11"
		rx="2"
		stroke={color}
		stroke-width="1.5"
		stroke-linejoin="round"
	/>
	<path
		d="M15 9V7C15 5.89543 14.1046 5 13 5H7C5.89543 5 5 5.89543 5 7V13C5 14.1046 5.89543 15 7 15H9"
		stroke={color}
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
