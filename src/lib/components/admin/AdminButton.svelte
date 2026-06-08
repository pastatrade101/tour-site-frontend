<script lang="ts">
  export let ariaLabel: string | undefined = undefined;
  export let className = '';
  export let disabled = false;
  export let size: 'sm' | 'md' = 'md';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'danger' | 'ghost' | 'primary' | 'secondary' = 'primary';

  const variantClass = {
    danger: 'border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50',
    ghost: 'border border-transparent bg-transparent text-ink/70 hover:bg-sand hover:text-deep-green',
    primary: 'border border-forest bg-forest text-white shadow-sm shadow-forest/15 hover:bg-deep-green hover:border-deep-green',
    secondary: 'border border-ink/10 bg-white text-ink shadow-sm hover:border-goldfinch-gold/40 hover:bg-sand/75'
  };

  const sizeClass = {
    sm: 'h-9 rounded-xl px-3 text-xs',
    md: 'h-11 rounded-2xl px-4 text-sm'
  };
</script>

<button
  class={`inline-flex items-center justify-center gap-2 font-semibold tracking-normal transition disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 ${variantClass[variant]} ${sizeClass[size]} ${className}`}
  {type}
  {disabled}
  aria-label={ariaLabel}
  on:click
>
  <slot />
</button>
