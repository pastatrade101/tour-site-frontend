<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let placeholder = '';
  export let rows = 4;
  export let required = false;
  export let hint = '';
</script>

<label class="grid gap-1.5">
  <span class="gf-label">
    {label}{#if required}<span class="gf-req"> *</span>{/if}
    {#if hint}<span class="gf-hint"> {hint}</span>{/if}
  </span>
  <textarea class="gf-textarea" {name} bind:value {placeholder} {rows} {required}></textarea>
</label>
