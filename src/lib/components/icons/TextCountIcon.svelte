<script lang="ts">
  let { 
    color = 'var(--text)', 
    opacity = 0.6,
    width = 10, 
    height = 10,
    class: className = ''
  }: { 
    color?: string;
    opacity?: number;
    width?: number; 
    height?: number; 
    class?: string;
  } = $props();
</script>

<svg {width} {height} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" class={className}>
  <g clip-path="url(#clip0_21_1066)">
    <path d="M9 3V1H1V3" stroke={color} stroke-opacity={opacity} stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 3V9M5 9H4M5 9H6" stroke={color} stroke-opacity={opacity} stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs>
    <clipPath id="clip0_21_1066">
      <rect width="10" height="10" fill="white"/>
    </clipPath>
  </defs>
</svg>

