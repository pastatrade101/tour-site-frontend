<script lang="ts">
  import { Check, Copy, Download } from '@lucide/svelte';

  /**
   * The recovery codes, the one time they are shown. The server keeps only a
   * hash of each, so this screen is the only copy: it offers to copy them or
   * save them as a text file, and says where not to keep them.
   */
  export let codes: string[] = [];
  /** The account's email, written at the top of the saved file. */
  export let account = '';

  let copied = false;

  const asText = () => {
    const created = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
    const lines = ['Goldfinch Adventures CMS: recovery codes'];
    if (account) lines.push(`Account: ${account}`);
    lines.push(`Created: ${created}`, '', ...codes, '', 'Each code signs you in once, in place of the code from your authenticator app.');
    return lines.join('\n');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // The codes are on screen: they can still be written down.
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([asText()], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'goldfinch-cms-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };
</script>

<div class="rounded-lg border border-ink/10 bg-black/[0.02] p-4">
  <ul class="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm font-semibold tracking-wide text-ink">
    {#each codes as code}
      <li>{code}</li>
    {/each}
  </ul>

  <div class="mt-4 flex flex-wrap gap-2">
    <button class="action" type="button" on:click={copy}>
      {#if copied}<Check size={14} />Copied{:else}<Copy size={14} />Copy{/if}
    </button>
    <button class="action" type="button" on:click={download}><Download size={14} />Save as a file</button>
  </div>
</div>

<p class="mt-3 text-[13px] leading-5 text-ink/60">
  Each code works once. Keep them somewhere other than the phone that has the app: a password manager, or a printout.
</p>

<style>
  .action {
    display: inline-flex;
    height: 2.25rem;
    align-items: center;
    gap: 0.375rem;
    border-radius: 0.375rem;
    border: 1px solid rgb(var(--c-ink) / 0.15);
    background: rgb(var(--c-surface));
    padding: 0 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--c-ink));
    transition: border-color 0.15s;
  }
  .action:hover {
    border-color: rgb(var(--c-forest) / 0.3);
  }
</style>
