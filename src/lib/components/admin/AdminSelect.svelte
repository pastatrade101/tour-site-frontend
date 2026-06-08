<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let options: { label: string; value: string }[] = [];
</script>

<label class="grid gap-2 text-sm font-semibold text-ink">
  <span>{label}</span>
  <select class="h-11 rounded-2xl border border-ink/10 bg-white px-3.5 text-sm outline-none shadow-sm transition focus:border-forest focus:ring-4 focus:ring-forest/10" {name} bind:value on:change>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
