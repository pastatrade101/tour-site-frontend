<script lang="ts">
  export let className = '';
</script>

<div class={`w-full min-w-0 max-w-full rounded-[10px] border border-ink/10 bg-surface p-4 shadow-card ${className}`}>
  <slot />
</div>
