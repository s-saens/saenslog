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
  <circle cx="6" cy="6" r="2" fill={color}/>
  <circle cx="12" cy="6" r="2" fill={color}/>
  <circle cx="12" cy="12" r="2" fill={color}/>
  <circle cx="12" cy="18" r="2" fill={color}/>
  <circle cx="18" cy="6" r="2" fill={color}/>
</svg>

