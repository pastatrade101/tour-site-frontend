<script lang="ts">
  import { Check, Copy } from '@lucide/svelte';

  /**
   * Setting an authenticator app up: the QR code, and the same key as text for
   * a phone whose camera cannot be used. Shared by the sign-in screen (when the
   * site requires two-step sign-in) and the Sign-in security page.
   *
   * The QR code is a PNG made by the server and shown as a picture. Nothing
   * the server sends here is ever inserted into the page as markup.
   */
  export let qr = '';
  export let secret = '';

  let copied = false;
  // In fours, as the apps show it. Each group stays whole when the line wraps.
  $: groups = secret.match(/.{1,4}/g) ?? [];
  $: picture = qr.startsWith('data:image/png;base64,') ? qr : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // The key is on screen: it can still be typed by hand.
    }
  };
</script>

<ol class="grid gap-4 text-sm leading-6 text-ink/75">
  <li class="flex gap-3">
    <span class="step">1</span>
    <p>Install <strong class="font-semibold text-ink">Google Authenticator</strong> on your phone. Any authenticator app works: Microsoft Authenticator, Authy, 1Password.</p>
  </li>

  <li class="flex gap-3">
    <span class="step">2</span>
    <div class="min-w-0 flex-1">
      <p>In the app, tap <strong class="font-semibold text-ink">+</strong>, choose <strong class="font-semibold text-ink">Scan a QR code</strong>, and point the camera here.</p>

      {#if picture}
        <!-- White behind the code in both themes: a camera reads dark on light. -->
        <img class="mt-3 h-[200px] w-[200px] rounded-lg border border-ink/10 bg-white p-2" src={picture} width="200" height="200" alt="QR code to scan with your authenticator app" />
      {/if}

      <p class="mt-3 text-[13px] text-ink/60">Cannot scan it? Choose <strong class="font-semibold text-ink/80">Enter a setup key</strong> in the app and type this key:</p>
      <div class="mt-1.5 flex items-center gap-2">
        <code class="flex min-w-0 flex-1 flex-wrap gap-x-2 rounded-md border border-ink/10 bg-black/[0.03] px-3 py-2 font-mono text-[13px] font-semibold tracking-wide text-ink">
          {#each groups as group}<span>{group}</span>{/each}
        </code>
        <button
          class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-ink/15 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-forest/30"
          type="button"
          on:click={copy}
        >
          {#if copied}<Check size={14} />Copied{:else}<Copy size={14} />Copy{/if}
        </button>
      </div>
    </div>
  </li>

  <li class="flex gap-3">
    <span class="step">3</span>
    <p>The app now shows a six-digit code that changes every 30 seconds. Type the current one below.</p>
  </li>
</ol>

<style>
  .step {
    display: grid;
    flex: none;
    width: 1.5rem;
    height: 1.5rem;
    place-items: center;
    border-radius: 9999px;
    background: rgb(var(--c-forest) / 0.1);
    color: rgb(var(--c-forest));
    font-size: 0.75rem;
    font-weight: 700;
  }
</style>
