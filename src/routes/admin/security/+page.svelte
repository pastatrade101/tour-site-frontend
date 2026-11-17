<script lang="ts">
  import { onMount } from 'svelte';
  import { KeyRound, ShieldCheck, ShieldOff, Smartphone, Users } from '@lucide/svelte';
  import { api, type TwoFactorSetup, type TwoFactorStatus } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import RecoveryCodes from '$lib/components/admin/RecoveryCodes.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import TwoFactorSetupGuide from '$lib/components/admin/TwoFactorSetupGuide.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import { twoFactorStatus } from '$lib/twoFactorStatus';

  /**
   * Sign-in security: the signed-in account's own two-step sign-in, and, for a
   * super admin, the rule that requires it of every account.
   *
   * One thing is open at a time:
   *   password    turning it on starts by asking for the password again;
   *   scan        the QR code and the first code from the app;
   *   codes       recovery codes, shown once (after turning on, or on request);
   *   regenerate  a new set of recovery codes, for a code from the app;
   *   disable     turning it off, for the password and a code.
   */
  type Panel = 'none' | 'password' | 'scan' | 'codes' | 'regenerate' | 'disable';
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  let status: TwoFactorStatus | null = null;
  let loading = true;
  let unavailable = '';
  let panel: Panel = 'none';
  let busy = false;
  let panelError = '';
  let password = '';
  let code = '';
  let setup: TwoFactorSetup | null = null;
  let recoveryCodes: string[] = [];
  let role = '';
  let email = '';
  let savingPolicy = false;
  let confirmPolicy: 'on' | 'off' | null = null;
  let toasts: Toast[] = [];

  $: isSuperAdmin = role === 'super_admin';
  // The CMS shell shows a reminder and the state in the profile menu: keep them in step with this page.
  $: if (status) twoFactorStatus.set(status);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 4000);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const fmtDate = (v?: string | null) => (v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '');
  const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

  const load = async () => {
    try {
      status = (await api.auth.twoFactor()).data;
      unavailable = '';
    } catch (err) {
      status = null;
      unavailable = messageOf(err, 'Unable to load sign-in security.');
    } finally {
      loading = false;
    }
  };

  /**
   * After a change: show what is now true straight away, then confirm it with
   * the server. A re-read that fails leaves the page as it is, so recovery
   * codes that are on screen are never taken away by it.
   */
  const settle = async (change: Partial<TwoFactorStatus>) => {
    if (status) status = { ...status, ...change };
    try {
      status = (await api.auth.twoFactor()).data;
    } catch {
      // What was just applied stands until the page is next opened.
    }
  };

  const open = (next: Panel) => {
    panel = next;
    panelError = '';
    password = '';
    code = '';
  };
  const close = () => {
    open('none');
    setup = null;
    recoveryCodes = [];
  };

  /** Runs one step, showing what the server says when it refuses. */
  const run = async (fallback: string, action: () => Promise<void>) => {
    if (busy) return;
    busy = true;
    panelError = '';
    try {
      await action();
    } catch (err) {
      panelError = messageOf(err, fallback);
    } finally {
      busy = false;
    }
  };

  const startSetup = () =>
    run('Unable to start the setup.', async () => {
      setup = (await api.auth.twoFactorSetup({ password })).data;
      open('scan');
    });

  const enable = () =>
    run('Unable to turn two-step sign-in on.', async () => {
      recoveryCodes = (await api.auth.twoFactorEnable({ code: code.trim() })).data.recovery_codes;
      setup = null;
      open('codes');
      showToast('Two-step sign-in is on.');
      await settle({ enabled: true, enabled_at: new Date().toISOString(), recovery_codes_left: recoveryCodes.length });
    });

  const regenerate = () =>
    run('Unable to create new recovery codes.', async () => {
      recoveryCodes = (await api.auth.twoFactorRecoveryCodes({ code: code.trim() })).data.recovery_codes;
      open('codes');
      showToast('New recovery codes created. The old ones no longer work.');
      await settle({ recovery_codes_left: recoveryCodes.length });
    });

  const disable = () =>
    run('Unable to turn two-step sign-in off.', async () => {
      await api.auth.twoFactorDisable({ password, code: code.trim() });
      close();
      showToast('Two-step sign-in is off.');
      await settle({ enabled: false, enabled_at: null, recovery_codes_left: 0 });
    });

  const setPolicy = async (required: boolean) => {
    confirmPolicy = null;
    savingPolicy = true;
    try {
      await api.auth.twoFactorPolicy(required);
      showToast(required ? 'Two-step sign-in is now required for every account.' : 'Two-step sign-in is now optional.');
      await settle({ required });
    } catch (err) {
      showToast(messageOf(err, 'Unable to save the rule.'), 'error');
    } finally {
      savingPolicy = false;
    }
  };

  // Both directions are confirmed: on asks something of the whole team, off takes a protection away.
  const togglePolicy = () => {
    if (!status) return;
    confirmPolicy = status.required ? 'off' : 'on';
  };

  onMount(() => {
    try {
      const u = JSON.parse(localStorage.getItem('admin_user') ?? 'null');
      role = String(u?.role ?? '');
      email = String(u?.email ?? '');
    } catch {
      role = '';
    }
    load();
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[900px] gap-6">
  <AdminPageHeader
    eyebrow="Your account"
    title="Sign-in security"
    description="Two-step sign-in asks for a code from an app on your phone after your password, so a stolen or guessed password is not enough to open the CMS."
  />

  {#if loading}
    <LoadingState message="Loading sign-in security..." />
  {:else if !status}
    <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card sm:p-6">
      <h2 class="text-lg font-bold text-ink">Two-step sign-in</h2>
      <p class="mt-2 text-sm leading-6 text-ink/65">{unavailable}</p>
    </section>
  {:else}
    <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex min-w-0 items-start gap-3">
          <span class={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${status.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-black/[0.04] text-ink/55'}`}>
            <Smartphone size={20} />
          </span>
          <div class="min-w-0">
            <h2 class="text-lg font-bold text-ink">Two-step sign-in</h2>
            <p class="mt-0.5 text-sm text-ink/60">Google Authenticator, or any authenticator app.</p>
          </div>
        </div>

        {#if status.enabled}
          <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200/70">
            <ShieldCheck size={13} />On since {fmtDate(status.enabled_at)}
          </span>
        {:else}
          <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Off</span>
        {/if}
      </div>

      {#if status.required && !status.enabled}
        <p class="mt-5 rounded-lg border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-3 py-2.5 text-sm font-medium text-clay">
          Two-step sign-in is required for every account. You will be asked to set it up the next time you sign in.
        </p>
      {/if}

      <!-- ── Off ─────────────────────────────────────────────────────── -->
      {#if !status.enabled && panel === 'none'}
        {#if status.can_enrol}
          <div class="mt-5">
            <AdminButton on:click={() => open('password')}><ShieldCheck size={15} />Turn on two-step sign-in</AdminButton>
          </div>
        {:else}
          <p class="mt-5 rounded-lg border border-ink/10 bg-black/[0.02] px-3 py-2.5 text-sm leading-6 text-ink/65">
            This is a development copy of the CMS. Turn two-step sign-in on from the live CMS: a setup made here would not work there.
          </p>
        {/if}
      {/if}

      {#if panel === 'password'}
        <form class="mt-5 grid max-w-sm gap-4 border-t border-ink/10 pt-5" on:submit|preventDefault={startSetup}>
          <p class="text-sm leading-6 text-ink/65">Enter your password to begin. This makes sure it is you, and not someone at a computer you left signed in.</p>
          <AdminFormInput label="Your password" name="current_password" type="password" bind:value={password} required />
          {#if panelError}<p class="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{panelError}</p>{/if}
          <div class="flex gap-3">
            <AdminButton type="submit" disabled={busy}>{busy ? 'Checking...' : 'Continue'}</AdminButton>
            <AdminButton variant="secondary" on:click={close}>Cancel</AdminButton>
          </div>
        </form>
      {/if}

      {#if panel === 'scan' && setup}
        <div class="mt-5 border-t border-ink/10 pt-5">
          <TwoFactorSetupGuide qr={setup.qr_data_url} secret={setup.secret} />
          <form class="mt-5 grid max-w-sm gap-4" on:submit|preventDefault={enable}>
            <label class="grid gap-1.5">
              <span class="text-[13px] font-semibold text-ink/65">Six-digit code</span>
              <input class="code-input" type="text" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000000" bind:value={code} required />
            </label>
            {#if panelError}<p class="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{panelError}</p>{/if}
            <div class="flex gap-3">
              <AdminButton type="submit" disabled={busy}>{busy ? 'Checking...' : 'Turn on'}</AdminButton>
              <AdminButton variant="secondary" on:click={close}>Cancel</AdminButton>
            </div>
          </form>
        </div>
      {/if}

      <!-- ── Recovery codes, the one time they are shown ─────────────── -->
      {#if panel === 'codes'}
        <div class="mt-5 border-t border-ink/10 pt-5">
          <h3 class="text-sm font-bold text-ink">Save your recovery codes</h3>
          <p class="mt-1 text-sm leading-6 text-ink/65">If you lose your phone, one of these codes signs you in instead. This is the only time they are shown.</p>
          <div class="mt-4 max-w-md">
            <RecoveryCodes codes={recoveryCodes} account={email} />
          </div>
          <div class="mt-5">
            <AdminButton on:click={close}>I have saved them</AdminButton>
          </div>
        </div>
      {/if}

      <!-- ── On ──────────────────────────────────────────────────────── -->
      {#if status.enabled && panel === 'none'}
        <div class="mt-5 grid gap-4 border-t border-ink/10 pt-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink">Recovery codes</p>
              <p class={`mt-0.5 text-sm ${status.recovery_codes_left <= 2 ? 'font-medium text-clay' : 'text-ink/60'}`}>
                {status.recovery_codes_left} of {status.recovery_codes_total} left.
                {#if status.recovery_codes_left <= 2}Create a new set before they run out.{/if}
              </p>
            </div>
            <AdminButton variant="secondary" size="sm" on:click={() => open('regenerate')}><KeyRound size={14} />New recovery codes</AdminButton>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink">New phone?</p>
              <p class="mt-0.5 text-sm text-ink/60">Turn two-step sign-in off, then on again, to scan a new QR code.</p>
            </div>
            <AdminButton variant="danger" size="sm" on:click={() => open('disable')}><ShieldOff size={14} />Turn off</AdminButton>
          </div>
        </div>
      {/if}

      {#if panel === 'regenerate'}
        <form class="mt-5 grid max-w-sm gap-4 border-t border-ink/10 pt-5" on:submit|preventDefault={regenerate}>
          <p class="text-sm leading-6 text-ink/65">Type the code your authenticator app shows now. The codes you saved before will stop working.</p>
          <label class="grid gap-1.5">
            <span class="text-[13px] font-semibold text-ink/65">Six-digit code</span>
            <input class="code-input" type="text" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="20" placeholder="000000" bind:value={code} required />
          </label>
          {#if panelError}<p class="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{panelError}</p>{/if}
          <div class="flex gap-3">
            <AdminButton type="submit" disabled={busy}>{busy ? 'Checking...' : 'Create new codes'}</AdminButton>
            <AdminButton variant="secondary" on:click={close}>Cancel</AdminButton>
          </div>
        </form>
      {/if}

      {#if panel === 'disable'}
        <form class="mt-5 grid max-w-sm gap-4 border-t border-ink/10 pt-5" on:submit|preventDefault={disable}>
          <p class="text-sm leading-6 text-ink/65">
            Turning it off needs your password and a code from the app.
            {#if status.required}Two-step sign-in is required for every account, so you will be asked to set it up again the next time you sign in.{/if}
          </p>
          <AdminFormInput label="Your password" name="current_password" type="password" bind:value={password} required />
          <label class="grid gap-1.5">
            <span class="text-[13px] font-semibold text-ink/65">Six-digit code, or a recovery code</span>
            <input class="code-input" type="text" name="code" autocomplete="one-time-code" maxlength="20" placeholder="000000" bind:value={code} required />
          </label>
          {#if panelError}<p class="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{panelError}</p>{/if}
          <div class="flex gap-3">
            <AdminButton variant="danger" type="submit" disabled={busy}>{busy ? 'Checking...' : 'Turn off'}</AdminButton>
            <AdminButton variant="secondary" on:click={close}>Cancel</AdminButton>
          </div>
        </form>
      {/if}
    </section>

    <!-- ── The rule for every account (super admin) ──────────────────── -->
    {#if isSuperAdmin}
      <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex min-w-0 flex-1 items-start gap-3">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-ink/55"><Users size={20} /></span>
            <div class="min-w-0">
              <h2 class="text-lg font-bold text-ink">Require it for every account</h2>
              <p class="mt-0.5 max-w-xl text-sm leading-6 text-ink/60">
                Anyone who has not set it up is asked to, the next time they sign in, before the CMS opens. This is on unless you switch it off.
              </p>
            </div>
          </div>

          <button
            class={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${status.required ? 'bg-forest' : 'bg-ink/20'}`}
            type="button"
            role="switch"
            aria-checked={status.required}
            aria-label="Require two-step sign-in for every account"
            disabled={savingPolicy || (!status.required && !status.enabled)}
            on:click={togglePolicy}
          >
            <span class={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${status.required ? 'left-6' : 'left-1'}`}></span>
          </button>
        </div>

        {#if !status.required && !status.enabled}
          <p class="mt-4 text-sm text-ink/55">Turn two-step sign-in on for your own account first. Then you can require it of everyone.</p>
        {/if}
        <p class="mt-4 text-sm text-ink/55">
          Someone locked out because they lost their phone? Reset their two-step sign-in from
          <a class="font-semibold text-forest underline-offset-4 hover:underline" href="/admin/users">Users</a>.
        </p>
      </section>
    {/if}
  {/if}
</div>

<ConfirmModal
  open={confirmPolicy !== null}
  title={confirmPolicy === 'off' ? 'Make two-step sign-in optional?' : 'Require two-step sign-in for every account?'}
  message={confirmPolicy === 'off'
    ? 'Accounts that have not set it up will open the CMS with a password alone. Accounts that already use it keep it.'
    : 'Everyone who has not set it up will be asked to scan a QR code with an authenticator app the next time they sign in. Tell your team before you turn this on.'}
  on:cancel={() => (confirmPolicy = null)}
  on:confirm={() => setPolicy(confirmPolicy === 'on')}
/>

<style>
  .code-input {
    height: 2.75rem;
    width: 100%;
    border-radius: 0.375rem;
    border: 1px solid rgb(var(--c-ink) / 0.15);
    background: rgb(0 0 0 / 0.02);
    padding: 0 0.875rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    color: rgb(var(--c-ink));
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .code-input::placeholder {
    color: rgb(var(--c-ink) / 0.25);
  }
  .code-input:focus {
    border-color: rgb(var(--c-forest));
    box-shadow: 0 0 0 2px rgb(var(--c-forest) / 0.1);
  }
</style>
