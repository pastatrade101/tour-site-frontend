<script lang="ts">
  import {
    BadgeCheck,
    CalendarDays,
    Hotel,
    ListFilter,
    Luggage,
    MapPin,
    Search,
    TicketsPlane
  } from '@lucide/svelte';
  import { fadeUpOnScroll, heroImageParallax } from '$lib/animations';
  import { brand } from '$lib/brand';

  export let title = 'Plan East Africa With Confidence';
  export let description = 'Honest safari, Kilimanjaro, gorilla trekking and beach advice from local experts.';
  export let imageUrl = '/images/surf-hero.jpg';
  export let primaryCta = brand.primaryCta;
  export let secondaryCta = brand.secondaryCta;
  export let secondaryCtaUrl = '/contact';

  const tabs = [
    { label: 'Tours', icon: Luggage },
    { label: 'Hotels', icon: Hotel },
    { label: 'Visa', icon: TicketsPlane },
    { label: 'Experience', icon: BadgeCheck }
  ];
</script>

<section class="relative bg-white">
  <div class="relative h-[410px] overflow-hidden sm:h-[440px] md:h-[500px]">
    <img class="absolute inset-0 h-full w-full object-cover object-center" src={imageUrl} alt="Aerial view of surfers in ocean water" use:heroImageParallax={{ amount: 4 }} />
    <div class="absolute inset-0 bg-deep-green/35"></div>

    <div class="relative z-10 mx-auto flex h-full w-full max-w-[1500px] items-center justify-center px-5 pb-20 pt-10 text-center md:pb-20">
      <div class="mt-2 max-w-[880px] text-white" use:fadeUpOnScroll={{ y: 14, start: 'top 95%', duration: 0.65 }}>
        <h1 class="text-[32px] font-extrabold leading-[1.08] tracking-normal drop-shadow-sm sm:text-[42px] lg:text-[56px]">{title}</h1>
        <p class="mx-auto mt-4 max-w-[820px] text-[15px] font-semibold leading-6 drop-shadow-sm sm:text-lg lg:text-xl">{description}</p>
      </div>
    </div>
  </div>

  <div class="relative z-20 mx-auto -mt-[86px] w-full max-w-[1500px] px-5 pb-14 md:-mt-[92px] md:px-4 md:pb-18">
    <div class="relative rounded-[18px] bg-white px-4 pb-6 pt-12 shadow-[0_18px_42px_rgba(20,20,20,0.09)] md:rounded-[22px] md:px-10 md:pb-8 md:pt-14" use:fadeUpOnScroll={{ y: 18, start: 'top 96%', duration: 0.7 }}>
      <div class="layout-ltr absolute left-1/2 top-0 z-10 flex w-[calc(100vw-20px)] max-w-[390px] -translate-x-1/2 -translate-y-1/2 flex-nowrap justify-center gap-1 overflow-visible md:left-auto md:right-10 md:w-auto md:max-w-none md:translate-x-0 md:gap-2">
        {#each tabs as tab}
          <button class="inline-flex h-11 shrink-0 items-center justify-center gap-1 rounded-full border border-[#e8e8e8] bg-white px-2 text-[12px] font-semibold text-[#151515] shadow-sm sm:px-3 md:h-12 md:gap-2.5 md:px-5 md:text-[15px]" type="button">
            {tab.label}
            <span class="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-goldfinch-gold text-white md:h-6 md:w-6">
              <svelte:component this={tab.icon} size={12} strokeWidth={2.6} />
            </span>
          </button>
        {/each}
      </div>

      <form class="layout-ltr grid gap-4 lg:grid-cols-[1fr_1fr_1fr_176px] lg:gap-4">
        <label class="order-1 flex h-[62px] items-center justify-start gap-3 rounded-xl border border-[#e5e5e5] bg-white px-4 md:h-16 lg:order-1">
          <MapPin class="shrink-0 text-[#686868]" size={21} strokeWidth={2.5} />
          <span class="grid min-w-0 text-left">
            <span class="truncate text-[15px] font-semibold text-[#222222] md:text-lg">Serengeti Safari</span>
            <span class="text-xs font-medium text-[#6e6e6e] md:text-sm">Tanzania</span>
          </span>
          <select class="sr-only" aria-label="Destination">
            <option>Bali Paradaise</option>
          </select>
        </label>

        <label class="order-2 flex h-[62px] items-center justify-start gap-3 rounded-xl border border-[#e5e5e5] bg-white px-4 text-left md:h-16 lg:order-2">
          <CalendarDays class="shrink-0 text-[#686868]" size={20} strokeWidth={2.4} />
          <span class="text-[15px] font-medium text-[#5f5f5f] md:text-base">Select dates</span>
          <input class="sr-only" type="date" aria-label="Travel date" />
        </label>

        <label class="order-3 flex h-[62px] items-center justify-start gap-3 rounded-xl border border-[#e5e5e5] bg-white px-4 md:h-16 lg:order-3">
          <ListFilter class="shrink-0 text-[#686868]" size={21} strokeWidth={2.5} />
          <span class="grid min-w-0 text-left">
            <span class="truncate text-[15px] font-semibold text-[#222222] md:text-lg">Safari</span>
            <span class="text-xs font-medium text-[#6e6e6e] md:text-sm">Experience</span>
          </span>
          <select class="sr-only" aria-label="Tour category">
            <option>Family Tour</option>
          </select>
        </label>

        <button class="order-4 flex h-[62px] items-center justify-center gap-2.5 rounded-xl bg-forest px-6 text-sm font-semibold text-white shadow-sm md:h-16 md:text-base lg:order-4" type="submit">
          <Search size={20} strokeWidth={2.4} />
          {primaryCta}
        </button>
      </form>

      <p class="mt-4 text-center text-sm font-medium text-[#444444] md:text-left md:text-[15px]">
        Not sure what fits?
        <a class="font-semibold text-forest" href={secondaryCtaUrl}>{secondaryCta}</a>
      </p>
    </div>
  </div>
</section>
