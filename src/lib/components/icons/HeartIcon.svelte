<script lang="ts">
	let {
		filled = false,
		color = 'currentColor',
		width = 20,
		height = 20,
		class: className = ''
	}: {
		filled?: boolean;
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
	xmlns="http://www.w3.org/2000/svg"
	class={className}
	aria-hidden="true"
>
	<path
		d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
		stroke={color}
		stroke-width="1.85"
		stroke-linecap="round"
		stroke-linejoin="round"
		fill={filled ? color : 'none'}
	/>
</svg>
