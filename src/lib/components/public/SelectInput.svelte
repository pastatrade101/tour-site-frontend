<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let options: { label: string; value: string }[] = [];
  export let required = false;
  export let hint = '';
</script>

<label class="grid gap-1.5">
  <span class="gf-label">
    {label}{#if required}<span class="gf-req"> *</span>{/if}
    {#if hint}<span class="gf-hint"> {hint}</span>{/if}
  </span>
  <select class="gf-input" {name} bind:value {required}>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
