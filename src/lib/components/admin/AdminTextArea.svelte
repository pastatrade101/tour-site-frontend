<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let rows = 5;
  export let placeholder = '';
</script>

<label class="grid gap-1.5 text-sm font-medium text-ink/80">
  <span>{label}</span>
  <textarea class="rounded-md border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink/35 focus:border-forest focus:ring-2 focus:ring-forest/20" {name} bind:value {rows} {placeholder}></textarea>
</label>
