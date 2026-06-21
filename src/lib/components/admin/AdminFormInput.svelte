<script lang="ts">
  export let label: string;
  export let name: string;
  export let type = 'text';
  export let value = '';
  export let placeholder = '';
  export let required = false;
</script>

<label class="grid gap-1.5 text-sm font-medium text-ink/80">
  <span>{label}</span>
  <input class="h-10 rounded-md border border-ink/15 bg-white px-3 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink/35 focus:border-forest focus:ring-2 focus:ring-forest/20" {name} {type} bind:value {placeholder} {required} />
</label>
