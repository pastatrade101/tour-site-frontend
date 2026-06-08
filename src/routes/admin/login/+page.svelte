<script lang="ts">
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import Button from '$lib/components/public/Button.svelte';
  import FormInput from '$lib/components/public/FormInput.svelte';

  let email = 'admin@goldfinch.local';
  let password = '';
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
      <FormInput label="Password" name="password" type="password" bind:value={password} required />
    </div>
    <div class="mt-6">
      <Button type="submit" className="w-full">{loading ? 'Logging in...' : 'Login'}</Button>
    </div>
    {#if error}
      <p class="mt-4 text-sm text-red-700">{error}</p>
    {/if}
  </form>
</main>
