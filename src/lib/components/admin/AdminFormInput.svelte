<script lang="ts">
  export let label: string;
  export let name: string;
  export let type = 'text';
  export let value = '';
  export let placeholder = '';
  export let required = false;
</script>

<label class="grid gap-2 text-sm font-semibold text-ink">
  <span>{label}</span>
  <input class="h-11 rounded-2xl border border-ink/10 bg-white px-3.5 text-sm outline-none shadow-sm transition placeholder:text-ink/35 focus:border-forest focus:ring-4 focus:ring-forest/10" {name} {type} bind:value {placeholder} {required} />
</label>
