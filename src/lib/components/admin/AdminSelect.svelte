<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let options: { label: string; value: string }[] = [];
</script>

<label class="grid gap-1.5 text-sm font-medium text-ink/80">
  <span>{label}</span>
  <select class="h-10 rounded-md border border-ink/15 bg-white px-3 text-sm text-ink shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20" {name} bind:value on:change>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
