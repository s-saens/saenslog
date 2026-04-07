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

<svg {width} {height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class={className}>
  <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M3 7L12 13L21 7" stroke={color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
