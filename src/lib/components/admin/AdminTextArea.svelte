<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let rows = 5;
  export let placeholder = '';
</script>

<label class="grid gap-2 text-sm font-semibold text-ink">
  <span>{label}</span>
  <textarea class="rounded-2xl border border-ink/10 bg-white px-3.5 py-3 text-sm outline-none shadow-sm transition placeholder:text-ink/35 focus:border-forest focus:ring-4 focus:ring-forest/10" {name} bind:value {rows} {placeholder}></textarea>
</label>
