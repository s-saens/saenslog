<script lang="ts">
	let {
		color = 'currentColor',
		width = 14,
		height = 14,
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
	viewBox="0 0 14 14"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
	aria-hidden="true"
>
	<path
		d="M7 2.5v9M2.5 7h9"
		stroke={color}
		stroke-width="1.3"
		stroke-linecap="round"
	/>
</svg>
