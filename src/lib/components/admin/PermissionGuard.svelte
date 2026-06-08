<script lang="ts">
  import { browser } from '$app/environment';

  export let permission = '';
  export let fallback = false;

  const readPermissions = () => {
    if (!browser) return [];
    try {
      return JSON.parse(localStorage.getItem('admin_permissions') ?? '[]') as string[];
    } catch {
      return [];
    }
  };

  $: permissions = readPermissions();
  $: allowed = !permission || permissions.includes(permission) || permissions.includes('*');
</script>

{#if allowed}
  <slot />
{:else if fallback}
  <slot name="fallback" />
{/if}
