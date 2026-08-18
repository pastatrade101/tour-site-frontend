<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let rows = 5;
  export let placeholder = '';
  /** Hard input cap (enforced by the textarea itself). */
  export let maxlength: number | undefined = undefined;
  /**
   * Show "n/target" under the field. Independent of maxlength so SEO fields
   * can show a soft recommended length without truncating what admins type.
   */
  export let counter: number | undefined = undefined;

  $: counterTarget = counter ?? maxlength;
</script>

<label class="grid gap-1.5">
  <span class="text-[13px] font-semibold text-ink/65">{label}</span>
  <textarea
    class="rounded-md border border-ink/15 bg-black/[0.02] px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/25 focus:border-forest focus:bg-surface focus:ring-2 focus:ring-forest/20"
    {name}
    bind:value
    {rows}
    {placeholder}
    {maxlength}
  ></textarea>
  {#if counterTarget}
    <span class={`justify-self-end text-[11px] font-semibold ${value.length > counterTarget ? 'text-clay' : 'text-ink/40'}`}>
      {value.length}/{counterTarget}
    </span>
  {/if}
</label>
