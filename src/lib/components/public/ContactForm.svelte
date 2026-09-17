<script lang="ts">
  import { t } from '$lib/i18n/ui';
  /**
   * The general contact form.
   *
   * It was the one form on the site that behaved differently from the rest:
   * the generic FormInput/TextArea pair, a single blanket error line that named
   * three fields at once, and a dark button where every other form uses the
   * gold one. This version speaks the shared form vocabulary from app.css
   * (gf-label / gf-input / gf-textarea / gf-btn-primary), marks the specific
   * field that needs attention, and carries the same hidden honeypot as the
   * booking and trip-request forms.
   */
  import { Check, Loader2, Lock, Mail, MessageSquare, Phone, Tag, User } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { trackEvent } from '$lib/analytics';

  /** Off where the surrounding section already states the heading. */
  export let showHeader = true;
  /** Only where the page above the card has not already said this. */
  export let intro = '';
  /** Turn off where the parent already draws a card, to avoid a card in a card. */
  export let panel = true;

  let full_name = '';
  let email = '';
  let phone = '';
  let subject = '';
  let message = '';
  let hp_company = '';

  let submitting = false;
  let sent = false;
  let errorMessage = '';
  let errors: Record<string, string> = {};

  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const clearErr = (key: string) => {
    if (errors[key]) {
      const { [key]: _drop, ...rest } = errors;
      errors = rest;
    }
  };

  const validate = (): boolean => {
    const found: Record<string, string> = {};
    if (full_name.trim().length < 2) found.full_name = $t('ui.please_enter_your_full_name');
    if (!isEmail(email.trim())) found.email = $t('ui.that_email_address_does_not');
    if (message.trim().length < 10) found.message = $t('ui.please_tell_us_a_little');
    errors = found;
    return Object.keys(found).length === 0;
  };

  const submit = async () => {
    if (submitting) return;
    errorMessage = '';

    if (!validate()) {
      trackEvent('form_validation_error', { metadata: { form: 'contact' } });
      return;
    }

    // Invisible to a person, irresistible to a bot: a filled honeypot gets the
    // same confirmation and sends nothing.
    if (hp_company.trim()) {
      sent = true;
      return;
    }

    submitting = true;
    try {
      await api.contact.create({
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        subject: subject.trim() || null,
        message: message.trim()
      });
      full_name = '';
      email = '';
      phone = '';
      subject = '';
      message = '';
      sent = true;
      trackEvent('form_submitted', { metadata: { form: 'contact' } });
    } catch (error) {
      errorMessage = error instanceof Error && error.message ? error.message : $t('ui.unable_to_send_your_message');
    } finally {
      submitting = false;
    }
  };

  /* The site's own form vocabulary from app.css, plus room for the leading icon. */
  const fieldCls = 'gf-input pl-10';
  const iconCls = 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35';
  const errCls = 'text-[11.5px] font-semibold text-red-600';
</script>

<div class={panel ? 'rounded-[10px] border border-ink/10 bg-surface p-5 shadow-sm sm:p-6' : ''}>
  {#if sent}
    <div class="grid justify-items-center gap-3 py-8 text-center">
      <span class="grid h-12 w-12 place-items-center rounded-full bg-forest/10 text-forest">
        <Check size={22} strokeWidth={2.6} />
      </span>
      <h2 class="text-xl font-bold text-heading">{$t('ui.message_sent')}</h2>
      <p class="max-w-sm text-sm leading-6 text-ink/65">{$t('ui.thanks_for_reaching_out_your')}</p>
      <button type="button" class="gf-btn-ghost mt-1" on:click={() => (sent = false)}>{$t('ui.send_another')}</button>
    </div>
  {:else}
    {#if showHeader}
      <div class="mb-5 grid gap-1.5">
        <h2 class="text-xl font-bold tracking-normal text-heading">{$t('ui.send_us_a_message')}</h2>
        {#if intro}<p class="text-sm leading-6 text-ink/60">{intro}</p>{/if}
      </div>
    {/if}

    <form class="grid gap-4" on:submit|preventDefault={submit} novalidate>
      <!-- Named as nothing, so autofill has nothing to match. A honeypot
           labelled "Company" eats real enquiries. -->
      <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <input type="text" name="gf-x1" tabindex="-1" autocomplete="off" bind:value={hp_company} />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1.5">
          <span class="gf-label">{$t('form.full_name')}<span class="gf-req"> *</span></span>
          <span class="relative block">
            <User size={16} class={iconCls} />
            <input
              class="{fieldCls} {errors.full_name ? 'gf-input-error' : ''}"
              type="text"
              autocomplete="name"
              placeholder={$t('form.your_full_name')}
              bind:value={full_name}
              on:input={() => clearErr('full_name')}
              aria-invalid={Boolean(errors.full_name)}
              aria-describedby={errors.full_name ? 'contact-name-err' : undefined}
            />
          </span>
          {#if errors.full_name}<span id="contact-name-err" class={errCls}>{errors.full_name}</span>{/if}
        </label>

        <label class="grid gap-1.5">
          <span class="gf-label">{$t('form.email')}<span class="gf-req"> *</span></span>
          <span class="relative block">
            <Mail size={16} class={iconCls} />
            <input
              class="{fieldCls} {errors.email ? 'gf-input-error' : ''}"
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="off"
              spellcheck="false"
              placeholder="you@example.com"
              bind:value={email}
              on:input={() => clearErr('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'contact-email-err' : undefined}
            />
          </span>
          {#if errors.email}<span id="contact-email-err" class={errCls}>{errors.email}</span>{/if}
        </label>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1.5">
          <span class="gf-label">{$t('form.phone')}<span class="gf-hint"> · {$t('ui.optional')}</span></span>
          <span class="relative block">
            <Phone size={16} class={iconCls} />
            <input class={fieldCls} type="tel" inputmode="tel" autocomplete="tel" placeholder="+255 …" bind:value={phone} />
          </span>
        </label>

        <label class="grid gap-1.5">
          <span class="gf-label">{$t('ui.subject')}<span class="gf-hint"> · {$t('ui.optional')}</span></span>
          <span class="relative block">
            <Tag size={16} class={iconCls} />
            <input class={fieldCls} type="text" bind:value={subject} />
          </span>
        </label>
      </div>

      <label class="grid gap-1.5">
        <span class="gf-label">{$t('ui.message')}<span class="gf-req"> *</span></span>
        <span class="relative block">
          <MessageSquare size={16} class="pointer-events-none absolute left-3 top-3 text-ink/35" />
          <textarea
            class="gf-textarea pl-10 {errors.message ? 'gf-input-error' : ''}"
            rows="5"
            placeholder={$t('ui.who_is_travelling_roughly_when')}
            bind:value={message}
            on:input={() => clearErr('message')}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? 'contact-message-err' : undefined}
          ></textarea>
        </span>
        {#if errors.message}<span id="contact-message-err" class={errCls}>{errors.message}</span>{/if}
      </label>

      {#if errorMessage}
        <p class="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-semibold text-red-700" role="alert">
          {errorMessage}
        </p>
      {/if}

      <div class="mt-1 flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
        <button type="submit" class="gf-btn-primary w-full sm:w-auto sm:min-w-[180px]" disabled={submitting} aria-busy={submitting}>
          {#if submitting}<Loader2 size={16} class="animate-spin" />{/if}
          {submitting ? $t('ui.sending') : $t('ui.send_message')}
        </button>
        <span class="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink/50">
          <Lock size={12} />{$t('form.never_shared')}
        </span>
      </div>
    </form>
  {/if}
</div>
