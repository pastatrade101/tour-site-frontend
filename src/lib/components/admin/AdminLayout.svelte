<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import AdminSidebar from './AdminSidebar.svelte';
  import AdminTopbar from './AdminTopbar.svelte';

  export let currentPath = '/admin';
  export let title = 'Dashboard';

  let sidebarCollapsed = false;
  let mobileSidebarOpen = false;
  let user: { email?: string; name?: string; role?: string } | null = null;

  const loadUser = () => {
    if (!browser) return;
    try {
      user = JSON.parse(localStorage.getItem('admin_user') ?? 'null');
    } catch {
      user = null;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Local logout should still complete if the API is unavailable.
    }

    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_permissions');
    await goto('/admin/login');
  };

  onMount(loadUser);
</script>

<div class="h-screen overflow-hidden bg-[#f8f5ec] text-ink">
  <div class="flex h-full min-w-0">
    <AdminSidebar
      collapsed={sidebarCollapsed}
      {currentPath}
      mobileOpen={mobileSidebarOpen}
      {user}
      onCloseMobile={() => (mobileSidebarOpen = false)}
      onLogout={logout}
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

      <main
        class="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(217,164,65,0.12),transparent_32%),linear-gradient(180deg,#fbfaf5_0%,#f7f1e3_100%)] p-4 sm:p-6"
        data-lenis-prevent
      >
        <slot />
      </main>
    </div>
  </div>
</div>
