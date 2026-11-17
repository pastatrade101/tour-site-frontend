<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { ArrowLeft, Eye, EyeOff, Lock, Mail } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { api, ApiRequestError, type AdminSession, type TwoFactorSetup } from '$lib/api/client';
  import { branding } from '$lib/branding';
  import LoginSlider from '$lib/components/admin/LoginSlider.svelte';
  import RecoveryCodes from '$lib/components/admin/RecoveryCodes.svelte';
  import TwoFactorSetupGuide from '$lib/components/admin/TwoFactorSetupGuide.svelte';
  import { TWO_STEP_LATER_KEY } from '$lib/twoFactorStatus';

  type Slide = { image_url: string; title?: string; subtitle?: string };

  let email = 'admin@goldfinch.local';
  let password = '';
  let showPassword = false;
  let error = '';
  let loading = false;
  let slides: Slide[] = [];
  let checking = browser && !!localStorage.getItem('admin_token'); // verifying an existing session
  let timedOut = false;

  /**
   * Signing in can take more than the password:
   *   code   the account has two-step sign-in on: a code from the app, or a recovery code;
   *   setup  the site requires it and this account has not set it up yet;
   *   codes  set up just now: the recovery codes, shown this once.
   * Between the password and the next step the server hands out a short-lived
   * challenge. It is kept in memory only, and is not a session.
   */
  type Step = 'password' | 'code' | 'setup' | 'codes';
  let step: Step = 'password';
  let challenge = '';
  let code = '';
  let useRecovery = false;
  let setup: TwoFactorSetup | null = null;
  let recoveryCodes: string[] = [];
  let savedCodes = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;

  const EXPIRED = 'That sign-in attempt has expired. Enter your email and password again.';

  const clearStoredAuth = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_permissions');
  };

  const defaultSlides: Slide[] = [
    {
      image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801',
      title: 'Plan East Africa with confidence',
      subtitle: 'Honest safari, Kilimanjaro and beach advice from local experts.'
    }
  ];

  $: displaySlides = slides.length ? slides : defaultSlides;
  $: brandName = $branding.site_name || 'Goldfinch Adventures';

  const storeSession = (session: AdminSession) => {
    localStorage.setItem('admin_token', session.token);
    localStorage.setItem('admin_user', JSON.stringify(session.user));
    localStorage.setItem('admin_permissions', JSON.stringify(session.user.role === 'super_admin' ? ['*'] : []));
    // A new sign-in: the reminder to turn two-step sign-in on may be shown again.
    localStorage.removeItem(TWO_STEP_LATER_KEY);
  };

  /** Back to the email and password, with nothing of the unfinished attempt kept. */
  const startOver = (message = '') => {
    clearTimeout(expiryTimer);
    step = 'password';
    challenge = '';
    code = '';
    password = '';
    useRecovery = false;
    setup = null;
    error = message;
  };

  const fail = (requestError: unknown, fallback: string) => {
    const expired = requestError instanceof ApiRequestError && requestError.errors.some((item) => item.code === 'challenge_expired');
    if (expired) return startOver(EXPIRED);
    error = requestError instanceof Error ? requestError.message : fallback;
  };

  const login = async () => {
    loading = true;
    error = '';
    try {
      const { data } = await api.auth.login({ email, password });
      if ('token' in data) {
        storeSession(data);
        await goto('/admin');
        return;
      }

      // The password was right; one more step before a session exists.
      challenge = data.challenge;
      password = '';
      code = '';
      clearTimeout(expiryTimer);
      expiryTimer = setTimeout(() => startOver(EXPIRED), data.expires_in * 1000);
      if (data.two_factor === 'setup') {
        setup = (await api.auth.twoFactorSetup({ challenge })).data;
        step = 'setup';
      } else {
        step = 'code';
      }
    } catch (requestError) {
      fail(requestError, 'Unable to login.');
    } finally {
      loading = false;
    }
  };

  /** The second step: a code from the app, or a recovery code. */
  const verify = async () => {
    if (loading) return;
    loading = true;
    error = '';
    try {
      const { data } = await api.auth.verifyTwoFactor({ challenge, code: code.trim() });
      clearTimeout(expiryTimer);
      storeSession(data);
      // A recovery code is spent by being used: land where the rest can be counted and replaced.
      await goto(data.recovery_codes_left === undefined ? '/admin' : '/admin/security');
    } catch (requestError) {
      code = '';
      fail(requestError, 'Unable to check the code.');
    } finally {
      loading = false;
    }
  };

  /** Six digits is a whole code: no need to make anyone press the button. */
  const onCodeInput = () => {
    if (!useRecovery && /^\d{6}$/.test(code.replace(/\s+/g, ''))) verify();
  };

  /** Setting up from the sign-in screen: the first code from the app turns it on and signs in. */
  const enable = async () => {
    if (loading) return;
    loading = true;
    error = '';
    try {
      const { data } = await api.auth.twoFactorEnable({ challenge, code: code.trim() });
      clearTimeout(expiryTimer);
      if (data.token && data.user) storeSession(data as AdminSession);
      recoveryCodes = data.recovery_codes;
      code = '';
      step = 'codes';
    } catch (requestError) {
      code = '';
      fail(requestError, 'Unable to turn two-step sign-in on.');
    } finally {
      loading = false;
    }
  };

  const switchCodeKind = () => {
    useRecovery = !useRecovery;
    code = '';
    error = '';
  };

  onDestroy(() => clearTimeout(expiryTimer));

  onMount(async () => {
    timedOut = $page.url.searchParams.get('reason') === 'timeout';

    // Already signed in? Verify the token and skip the login screen.
    if (checking) {
      try {
        await api.auth.me();
        await goto('/admin');
        return;
      } catch {
        clearStoredAuth(); // stale/expired token — fall through to the form
        checking = false;
      }
    }

    // Slides are managed in Admin → Homepage → "login_slider" (extra_data.slides).
    try {
      const res = await api.homepage.get();
      const sections = (res.data ?? []) as unknown as Array<Record<string, unknown>>;
      const slider = sections.find((s) => s.section_key === 'login_slider');
      const extra = (slider?.extra_data ?? {}) as Record<string, unknown>;
      if (Array.isArray(extra.slides)) {
        slides = (extra.slides as Array<Record<string, unknown>>)
          .filter((s) => typeof s.image_url === 'string' && (s.image_url as string).trim())
          .map((s) => ({
            image_url: String(s.image_url),
            title: s.title ? String(s.title) : '',
            subtitle: s.subtitle ? String(s.subtitle) : ''
          }));
      }
    } catch {
      // fall back to defaultSlides
    }
  });
</script>

{#if checking}
  <div class="grid min-h-screen place-items-center bg-sand/40 text-sm font-medium text-ink/50">
    Checking your session…
  </div>
{:else}
<main class="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
  <!-- left: brand image slider (desktop) -->
  <div class="relative hidden lg:block">
    <LoginSlider slides={displaySlides} {brandName} />
  </div>

  <!-- right: sign-in form -->
  <div class="relative flex items-center justify-center bg-sand/40 px-6 py-10 md:px-10">
    <div class="w-full max-w-md">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-clay">{brandName} · Admin</p>

      {#if step === 'password'}
      <div class="mt-3 flex items-center gap-3">
        <h1 class="text-4xl font-extrabold tracking-tight text-heading md:text-5xl">Welcome</h1>
        <!-- decorative flight path (swap for a Lottie later) -->
        <svg class="mt-2 h-8 w-24 shrink-0 text-goldfinch-gold" viewBox="0 0 96 32" fill="none" aria-hidden="true">
          <path d="M2 27 C 28 27, 48 10, 80 7" stroke="currentColor" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round" />
          <path d="M76 1 l11 6 -11 6 3 -6 z" fill="currentColor" />
        </svg>
      </div>
      <p class="mt-1 text-ink/55">Sign in to your account</p>

      {#if timedOut}
        <p class="mt-5 rounded-lg border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-3 py-2.5 text-sm font-medium text-clay">
          You were signed out due to inactivity. Please sign in again.
        </p>
      {/if}

      <form class="mt-8 grid gap-4" on:submit|preventDefault={login}>
        <label class="grid gap-2 text-sm font-medium text-ink">
          <span>Email</span>
          <div class="relative">
            <Mail class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
            <input
              class="w-full rounded-xl border border-ink/15 bg-surface py-3 pl-10 pr-3 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="you@example.com"
              bind:value={email}
              required
            />
          </div>
        </label>

        <label class="grid gap-2 text-sm font-medium text-ink">
          <span>Password</span>
          <div class="relative">
            <Lock class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
            <input
              class="w-full rounded-xl border border-ink/15 bg-surface py-3 pl-10 pr-11 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autocomplete="current-password"
              placeholder="••••••••"
              bind:value={password}
              required
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink/45 transition hover:text-ink/70"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              on:click={() => (showPassword = !showPassword)}
            >
              {#if showPassword}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
            </button>
          </div>
        </label>

        {#if error}
          <p class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        {/if}

        <button
          type="submit"
          class="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-deep-green px-6 font-bold text-white shadow-sm transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
      {:else if step === 'code'}
        <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-heading md:text-4xl">Enter your code</h1>
        <p class="mt-2 text-ink/60">
          {#if useRecovery}
            Type one of the recovery codes you saved when you set two-step sign-in up. Each one works once.
          {:else}
            Open Google Authenticator on your phone and type the six-digit code it shows for {brandName}.
          {/if}
        </p>

        <form class="mt-8 grid gap-4" on:submit|preventDefault={verify}>
          <label class="grid gap-2 text-sm font-medium text-ink">
            <span>{useRecovery ? 'Recovery code' : 'Six-digit code'}</span>
            {#if useRecovery}
              <input
                class="w-full rounded-xl border border-ink/15 bg-surface px-4 py-3 font-mono text-lg font-semibold uppercase tracking-[0.12em] outline-none transition placeholder:font-normal placeholder:text-ink/30 focus:border-forest focus:ring-2 focus:ring-forest/15"
                type="text"
                name="recovery_code"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                maxlength="20"
                placeholder="ABCDE-FGHJK"
                bind:value={code}
                required
              />
            {:else}
              <!-- svelte-ignore a11y_autofocus -->
              <input
                class="w-full rounded-xl border border-ink/15 bg-surface px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] outline-none transition placeholder:text-ink/25 focus:border-forest focus:ring-2 focus:ring-forest/15"
                type="text"
                name="code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="7"
                placeholder="000000"
                bind:value={code}
                on:input={onCodeInput}
                autofocus
                required
              />
            {/if}
          </label>

          {#if error}
            <p class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
          {/if}

          <button
            type="submit"
            class="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-deep-green px-6 font-bold text-white shadow-sm transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Checking…' : 'Verify and sign in'}
          </button>
        </form>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button class="inline-flex items-center gap-1.5 font-semibold text-ink/55 transition hover:text-ink" type="button" on:click={() => startOver()}>
            <ArrowLeft size={15} />Back to sign in
          </button>
          <button class="font-semibold text-forest underline-offset-4 transition hover:underline" type="button" on:click={switchCodeKind}>
            {useRecovery ? 'Use the code from the app' : 'Lost your phone? Use a recovery code'}
          </button>
        </div>
      {:else if step === 'setup'}
        <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-heading md:text-4xl">Set up two-step sign-in</h1>
        <p class="mt-2 text-ink/60">
          {brandName} asks every account to sign in with a code from an authenticator app as well as a password. It takes about a minute, once.
        </p>

        <div class="mt-6">
          <TwoFactorSetupGuide qr={setup?.qr_data_url ?? ''} secret={setup?.secret ?? ''} />
        </div>

        <form class="mt-5 grid gap-4" on:submit|preventDefault={enable}>
          <label class="grid gap-2 text-sm font-medium text-ink">
            <span>Six-digit code</span>
            <input
              class="w-full rounded-xl border border-ink/15 bg-surface px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] outline-none transition placeholder:text-ink/25 focus:border-forest focus:ring-2 focus:ring-forest/15"
              type="text"
              name="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="7"
              placeholder="000000"
              bind:value={code}
              required
            />
          </label>

          {#if error}
            <p class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
          {/if}

          <button
            type="submit"
            class="inline-flex h-12 items-center justify-center rounded-xl bg-deep-green px-6 font-bold text-white shadow-sm transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Checking…' : 'Turn on and sign in'}
          </button>
        </form>

        <button class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 transition hover:text-ink" type="button" on:click={() => startOver()}>
          <ArrowLeft size={15} />Back to sign in
        </button>
      {:else}
        <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-heading md:text-4xl">Save your recovery codes</h1>
        <p class="mt-2 text-ink/60">
          Two-step sign-in is on. If you ever lose your phone, one of these codes signs you in instead. This is the only time they are shown.
        </p>

        <div class="mt-6">
          <RecoveryCodes codes={recoveryCodes} account={email} />
        </div>

        <label class="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink/75">
          <input class="mt-0.5 h-4 w-4 accent-forest" type="checkbox" bind:checked={savedCodes} />
          <span>I have saved these codes somewhere safe.</span>
        </label>

        <button
          type="button"
          class="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-deep-green px-6 font-bold text-white shadow-sm transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!savedCodes}
          on:click={() => goto('/admin')}
        >
          Continue to the CMS
        </button>
      {/if}

      <p class="mt-10 text-center text-xs text-ink/40">{brandName} · Content Management System</p>
    </div>
  </div>
</main>
{/if}
