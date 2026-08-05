<script lang="ts">
  export let label: string;
  export let name: string;
  export let type = 'text';
  export let value = '';
  export let placeholder = '';
  export let required = false;
  export let hint = '';
</script>

<label class="grid gap-1.5">
  <span class="gf-label">
    {label}{#if required}<span class="gf-req"> *</span>{/if}
    {#if hint}<span class="gf-hint"> {hint}</span>{/if}
  </span>
  <input class="gf-input" {name} {type} bind:value {placeholder} {required} />
</label>
