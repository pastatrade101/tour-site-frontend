<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { KeyRound } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { TWO_STEP_LATER_KEY, twoFactorStatus } from '$lib/twoFactorStatus';
  import AdminSidebar from './AdminSidebar.svelte';
  import AdminTopbar from './AdminTopbar.svelte';
  import SessionTimeout from './SessionTimeout.svelte';

  export let currentPath = '/admin';
  export let title = 'Dashboard';

  let sidebarCollapsed = false;
  let mobileSidebarOpen = false;
  let user: { email?: string; name?: string; role?: string } | null = null;
  // Analytics is a workspace, not a card inside the standard grey content
  // well. Give it an edge-to-edge white canvas without changing any other
  // admin route's spacing or background.
  $: analyticsWorkspace = currentPath === '/admin/analytics';

  const loadUser = () => {
    if (!browser) return;
    try {
      user = JSON.parse(localStorage.getItem('admin_user') ?? 'null');
    } catch {
      user = null;
    }
  };

  /**
   * The reminder to turn two-step sign-in on. Shown under the top bar on every
   * page until the account has it on, or "Not now" is pressed for this
   * sign-in. Not shown where it cannot be acted on: a server that may not turn
   * it on (development), or the Sign-in security page itself.
   */
  let twoStepLater = false;
  $: showTwoStepPrompt =
    Boolean($twoFactorStatus && !$twoFactorStatus.enabled && $twoFactorStatus.can_enrol) && !twoStepLater && currentPath !== '/admin/security';

  const loadTwoStep = async () => {
    try {
      twoStepLater = localStorage.getItem(TWO_STEP_LATER_KEY) === '1';
    } catch {
      twoStepLater = false;
    }
    try {
      twoFactorStatus.set((await api.auth.twoFactor()).data);
    } catch {
      // Unknown is not "off": no reminder.
      twoFactorStatus.set(null);
    }
  };

  const remindLater = () => {
    twoStepLater = true;
    try {
      localStorage.setItem(TWO_STEP_LATER_KEY, '1');
    } catch {
      // Hidden for this page view only.
    }
  };

  // The Logout button calls this with its click event, so only a real reason goes into the address.
  const logout = async (reason?: string | Event) => {
    try {
      await api.auth.logout();
    } catch {
      // Local logout should still complete if the API is unavailable.
    }

    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_permissions');
    localStorage.removeItem(TWO_STEP_LATER_KEY);
    twoFactorStatus.set(null);
    await goto(typeof reason === 'string' && reason ? `/admin/login?reason=${reason}` : '/admin/login');
  };

  onMount(() => {
    loadUser();
    loadTwoStep();
  });
</script>

<!-- --admin-aside: current sidebar width, so fixed overlays (modals) can offset
     themselves and center within the CONTENT area instead of the full viewport. -->
<div class="admin-shell h-screen overflow-hidden bg-[#eef0f4] font-admin text-ink dark:bg-canvas" style={`--admin-aside:${sidebarCollapsed ? '78px' : '280px'}`}>
  <div class="flex h-full min-w-0">
    <AdminSidebar
      collapsed={sidebarCollapsed}
      {currentPath}
      mobileOpen={mobileSidebarOpen}
      onCloseMobile={() => (mobileSidebarOpen = false)}
      onToggleDesktop={() => (sidebarCollapsed = !sidebarCollapsed)}
    />

    <div class="flex min-w-0 flex-1 flex-col">
      <AdminTopbar
        collapsed={sidebarCollapsed}
        {title}
        {user}
        onLogout={logout}
        onOpenMobile={() => (mobileSidebarOpen = true)}
        onToggleDesktop={() => (sidebarCollapsed = !sidebarCollapsed)}
      />

      {#if showTwoStepPrompt}
        <div class="border-b border-goldfinch-gold/35 bg-goldfinch-gold/[0.12] px-4 py-2.5 sm:px-6" role="status">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <KeyRound size={16} class="shrink-0 text-forest" />
            <p class="min-w-0 flex-1 basis-64 text-sm leading-5 text-ink">
              <strong class="font-semibold">Two-step sign-in is off for your account.</strong>
              <span class="text-ink/70">Turn it on so a stolen password is not enough to open the CMS.</span>
            </p>
            <div class="flex shrink-0 items-center gap-1">
              <a
                class="inline-flex h-9 items-center rounded-md border border-forest bg-forest px-3.5 text-xs font-semibold text-white shadow-sm shadow-forest/15 transition hover:border-deep-green hover:bg-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25"
                href="/admin/security"
              >
                Turn it on
              </a>
              <button
                class="inline-flex h-9 items-center rounded-md px-3 text-xs font-semibold text-ink/65 transition hover:bg-black/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25"
                type="button"
                on:click={remindLater}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      {/if}

      <main
        class={`min-h-0 flex-1 overflow-y-auto ${analyticsWorkspace ? 'bg-white p-0' : 'bg-[#f5f6f8] p-4 sm:p-6 dark:bg-[#0b100e]'}`}
        data-lenis-prevent
      >
        <slot />
      </main>
    </div>
  </div>
</div>

<SessionTimeout onTimeout={() => logout('timeout')} />
