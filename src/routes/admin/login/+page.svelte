<script lang="ts">
  import { Eye, EyeOff } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import Button from '$lib/components/public/Button.svelte';
  import FormInput from '$lib/components/public/FormInput.svelte';

  let email = 'admin@goldfinch.local';
  let password = '';
  let showPassword = false;
  let error = '';
  let loading = false;

  const login = async () => {
    loading = true;
    error = '';
    try {
      const response = await api.auth.login({ email, password });
      localStorage.setItem('admin_token', response.data.token);
      localStorage.setItem('admin_user', JSON.stringify(response.data.user));
      localStorage.setItem('admin_permissions', JSON.stringify(response.data.user.role === 'super_admin' ? ['*'] : []));
      await goto('/admin');
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to login.';
    } finally {
      loading = false;
    }
  };
</script>

<main class="grid min-h-screen place-items-center bg-slate-50 p-5">
  <form class="w-full max-w-md rounded-lg border border-ink/10 bg-white p-6 shadow-soft" on:submit|preventDefault={login}>
    <p class="text-sm font-semibold uppercase tracking-[0.16em] text-clay">Admin CMS</p>
    <h1 class="mt-2 text-2xl font-bold text-ink">Login</h1>
    <div class="mt-6 grid gap-4">
      <FormInput label="Email" name="email" type="email" bind:value={email} required />
      <label class="grid gap-2 text-sm font-medium text-ink">
        <span>Password</span>
        <div class="relative">
          <input
            class="w-full rounded-md border border-ink/15 bg-white px-3 py-3 pr-11 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autocomplete="current-password"
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
    </div>
    <div class="mt-6">
      <Button type="submit" className="w-full">{loading ? 'Logging in...' : 'Login'}</Button>
    </div>
    {#if error}
      <p class="mt-4 text-sm text-red-700">{error}</p>
    {/if}
  </form>
</main>
