<script lang="ts">
  let { 
    color = 'var(--text)', 
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

<svg {width} {height} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class={className}>
  <g clip-path="url(#clip0_56_1183)">
    <path d="M3 12.7V3.3C3 3.13431 3.16741 3 3.37392 3H10.6352C10.7344 3 10.8295 3.03161 10.8996 3.08787L12.911 5.2819C12.9811 5.33817 13 5.55715 13 5.63672L12.9713 12.7C12.9713 12.8657 12.8039 13 12.5974 13H3.37392C3.16741 13 3 12.8657 3 12.7Z" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 11H1V1H8.5L10 2.57895" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 3V5.55C10 5.79853 10.2015 6 10.45 6H13" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 6H7.8" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 10H9.66667" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 8H7.33333" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs>
    <clipPath id="clip0_56_1183">
      <rect width="14" height="14" fill="white"/>
    </clipPath>
  </defs>
</svg>

