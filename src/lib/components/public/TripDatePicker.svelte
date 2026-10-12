<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { Calendar, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { locale, t } from '$lib/i18n/ui';

  export let value = '';
  export let min = '';
  export let label = '';
  export let invalid = false;
  export let disabled = false;
  export let describedBy: string | undefined = undefined;

  const dispatch = createEventDispatcher<{ change: void }>();
  let root: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let open = false;
  $: if (disabled) open = false;
  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  $: minYear = Number(min.slice(0, 4)) || new Date().getFullYear();
  $: years = Array.from({ length: 11 }, (_, i) => minYear + i);
  $: months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat($locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i, 1))));
  $: weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat($locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 5 + i))));
  $: display = value ? new Intl.DateTimeFormat($locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : '';
  $: offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  $: cells = Array.from({ length: Math.ceil((offset + new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) / 7) * 7 }, (_, i) => {
    const date = new Date(Date.UTC(year, month, i - offset + 1));
    const key = iso(date);
    return { key, day: date.getUTCDate(), disabled: date.getUTCMonth() !== month || key < min };
  });
  $: firstMonth = year === minYear && month <= Number(min.slice(5, 7)) - 1;
  $: lastMonth = year === minYear + 10 && month === 11;

  async function toggle() {
    open = !open;
    if (!open) return;
    const initial = value && value >= min ? value : min;
    if (initial) { year = Number(initial.slice(0, 4)); month = Number(initial.slice(5, 7)) - 1; }
    await tick();
    root?.querySelector<HTMLButtonElement>(`[data-date="${initial}"]`)?.focus({ preventScroll: true });
  }
  function close() { open = false; trigger?.focus({ preventScroll: true }); }
  function select(date: string) { value = date; dispatch('change'); close(); }
  function moveMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    year = next.getUTCFullYear(); month = next.getUTCMonth();
  }
  async function moveDay(event: KeyboardEvent, date: string) {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + delta);
    const key = iso(next);
    if (key < min || next.getUTCFullYear() > minYear + 10) return;
    year = next.getUTCFullYear(); month = next.getUTCMonth();
    await tick();
    root?.querySelector<HTMLButtonElement>(`[data-date="${key}"]`)?.focus({ preventScroll: true });
  }
  function escape(event: KeyboardEvent) {
    if (open && event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); close(); }
  }
  function focusOut(event: FocusEvent) {
    if (open && !root?.contains(event.relatedTarget as Node | null)) open = false;
  }
</script>

<svelte:window on:pointerdown={(event) => { if (open && !root?.contains(event.target as Node)) open = false; }} />

<div class="date-field" bind:this={root} on:focusout={focusOut} role="group" aria-label={label}>
  <button bind:this={trigger} type="button" {disabled} data-invalid={invalid} aria-describedby={describedBy} class="gf-input date-trigger" data-trip-field title={invalid ? $t('form.err_start_date') : undefined} aria-label={display ? `${label}: ${display}` : label} aria-haspopup="dialog" aria-expanded={open} on:keydown={escape} on:click={toggle}>
    <Calendar size={18} strokeWidth={1.7} aria-hidden="true" />
    {#if display}<span>{display}</span>{/if}
  </button>
  {#if open}
    <div class="calendar" role="dialog" tabindex="-1" aria-label={label} on:keydown={escape}>
      <div class="calendar-nav">
        <button class="month-arrow" type="button" aria-label={$t('form.previous_month')} disabled={firstMonth} on:click={() => moveMonth(-1)}><ChevronLeft size={18} /></button>
        <select class="gf-input month-select" aria-label={$t('form.month')} bind:value={month}>
          {#each months as name, index}<option value={index} disabled={year === minYear && index < Number(min.slice(5, 7)) - 1}>{name}</option>{/each}
        </select>
        <select class="gf-input year-select" aria-label={$t('form.year')} bind:value={year} on:change={(event) => { if (Number(event.currentTarget.value) === minYear) month = Math.max(month, Number(min.slice(5, 7)) - 1); }}>
          {#each years as option}<option value={option}>{option}</option>{/each}
        </select>
        <button class="month-arrow" type="button" aria-label={$t('form.next_month')} disabled={lastMonth} on:click={() => moveMonth(1)}><ChevronRight size={18} /></button>
      </div>
      <div class="days">
        {#each weekdays as day}<span class="weekday">{day}</span>{/each}
        {#each cells as day}
          <button type="button" class="day" class:selected={day.key === value} disabled={day.disabled} data-date={day.key} aria-pressed={day.key === value} aria-current={day.key === min ? 'date' : undefined} aria-label={new Intl.DateTimeFormat($locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${day.key}T00:00:00Z`))} on:click={() => select(day.key)} on:keydown={(event) => moveDay(event, day.key)}>{day.day}</button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .date-field { position: relative; min-width: 0; }
  .date-trigger { display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer; }
  .calendar { position: absolute; z-index: 30; top: calc(100% + 6px); inset-inline: 0; padding: 10px; border: 1px solid #d6ceb6; border-radius: 8px; background: white; color: #393d32; box-shadow: 0 12px 32px #0003; }
  .calendar-nav { display: grid; grid-template-columns: 20px minmax(0, 1fr) 75px 20px; gap: 2px; align-items: center; margin-bottom: 8px; }
  .calendar-nav .gf-input { height: 38px; font-size: 14px; padding-left: 8px; padding-right: 24px; background-position: right 5px center; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23393D32' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
  }
  .month-arrow { display: grid; place-items: center; min-height: 38px; border-radius: 5px; }
  .days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
  .weekday { text-align: center; font-size: 11px; line-height: 30px; overflow: hidden; }
  .day { min-width: 0; height: 36px; border-radius: 50%; font-size: 13px; }
  .day:hover:not(:disabled), .month-arrow:hover:not(:disabled) { background: #fff0c4; }
  .day.selected { background: rgb(var(--c-goldfinch-gold)); color: #272b22; font-weight: 700; }
  button:disabled { opacity: .32; cursor: default; }
  button:focus-visible { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 1px; }
</style>
