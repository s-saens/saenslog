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
  <g clip-path="url(#clip0_21_255)">
    <path d="M1 6.25V1.45C1 1.20147 1.16118 1 1.36 1H5.06683C5.15276 1 5.23586 1.03843 5.30111 1.10834L7.1989 3.14166C7.26412 3.21157 7.34722 3.25 7.4332 3.25H12.64C12.8388 3.25 13 3.45147 13 3.7V6.25M1 6.25V12.55C1 12.7985 1.16118 13 1.36 13H12.64C12.8388 13 13 12.7985 13 12.55V6.25M1 6.25H13" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs>
    <clipPath id="clip0_21_255">
      <rect width="14" height="14" fill="white"/>
    </clipPath>
  </defs>
</svg>

