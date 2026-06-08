<script lang="ts">
  export let className = '';
</script>

<div class={`rounded-3xl border border-ink/10 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,47,36,0.06)] backdrop-blur ${className}`}>
  <slot />
</div>
