<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeftRight, ArrowUpRight, MapPin, Timer } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';

  type Activity = {
    badge?: string;
    badgeTone?: 'red' | 'yellow';
    duration: string;
    image: string;
    location: string;
    price: number;
    priceLabel: string;
    title: string;
  };

  const activities: Activity[] = [
    {
      badge: 'Sale on!',
      badgeTone: 'red',
      duration: '30 Minute',
      image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=900&q=85',
      location: 'Maldives',
      price: 49,
      priceLabel: 'Per Person',
      title: 'Snowboarding & Ice Thrills'
    },
    {
      badge: 'Group Tour',
      badgeTone: 'yellow',
      duration: '45 Minute',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85',
      location: 'Nepal',
      price: 89,
      priceLabel: 'Starting From',
      title: 'Climbing & Mountaineering'
    },
    {
      duration: '20 Minute',
      image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=85',
      location: 'Goa, India',
      price: 39,
      priceLabel: 'Per Person',
      title: 'Surfing & Waterfalls'
    },
    {
      badge: 'Popular',
      badgeTone: 'yellow',
      duration: '55 Minute',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=85',
      location: 'Zanzibar',
      price: 65,
      priceLabel: 'Per Person',
      title: 'Diving & Island Hopping'
    },
    {
      duration: '40 Minute',
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=85',
      location: 'Vietnam',
      price: 59,
      priceLabel: 'Starting From',
      title: 'Kayaking & River Trails'
    },
    {
      badge: 'Family Tour',
      badgeTone: 'yellow',
      duration: '35 Minute',
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=85',
      location: 'Bali',
      price: 74,
      priceLabel: 'Per Person',
      title: 'Forest Walks & Viewpoints'
    }
  ];

  let viewport: HTMLDivElement;
  let cards: HTMLElement[] = [];
  let page = 0;
  let visibleCount = 3;

  $: pageCount = Math.max(Math.ceil(activities.length / visibleCount), 1);

  const registerCard = (node: HTMLElement, index: number) => {
    cards[index] = node;

    return {
      destroy() {
        cards[index] = undefined as unknown as HTMLElement;
      }
    };
  };

  const syncVisibleCount = () => {
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const nextVisibleCount = viewportWidth >= 1024 ? 3 : viewportWidth >= 700 ? 2 : 1;
    visibleCount = nextVisibleCount;

    const nextPageCount = Math.max(Math.ceil(activities.length / nextVisibleCount), 1);
    page = Math.min(page, nextPageCount - 1);
    requestAnimationFrame(() => goTo(page, false));
  };

  const goTo = (nextPage: number, smooth = true) => {
    page = Math.min(Math.max(nextPage, 0), pageCount - 1);
    const card = cards[page * visibleCount];

    if (!viewport || !card) return;
    viewport.scrollTo({
      behavior: smooth ? 'smooth' : 'auto',
      left: Math.max(card.offsetLeft - viewport.offsetLeft, 0)
    });
  };

  onMount(() => {
    syncVisibleCount();
    window.addEventListener('resize', syncVisibleCount);

    return () => window.removeEventListener('resize', syncVisibleCount);
  });
</script>

<section class="bg-white py-14 md:py-20" use:fadeUpOnScroll={{ y: 18 }}>
  <div class="container-shell">
    <div class="mx-auto max-w-2xl text-center">
      <h2 class="text-3xl font-extrabold tracking-normal text-[#111111] md:text-[40px]">Popular Activities</h2>
      <p class="mx-auto mt-3 max-w-[620px] text-[15px] font-medium leading-7 text-[#555555] md:text-lg">
        A curated list of the most popular travel packages based on different destinations.
      </p>
    </div>

    <div class="mt-10 overflow-hidden" bind:this={viewport}>
      <div class="activity-track" use:staggeredCardReveal={{ selector: '.activity-card', y: 16, stagger: 0.07 }}>
        {#each activities as activity, index}
          <article class="activity-card" use:registerCard={index}>
            <div class="relative overflow-hidden rounded-t-2xl">
              <img class="h-[176px] w-full object-cover" src={activity.image} alt={activity.title} />

              {#if activity.badge}
                <span class={`activity-badge ${activity.badgeTone === 'red' ? 'activity-badge-red' : 'activity-badge-yellow'}`}>
                  {activity.badge}
                </span>
              {/if}
            </div>

            <div class="px-4 pb-4 pt-4">
              <h3 class="text-[17px] font-extrabold leading-snug tracking-normal text-[#121212]">{activity.title}</h3>

              <div class="mt-2 flex flex-wrap items-center gap-2.5 text-[13px] font-semibold text-[#5f5f5f]">
                <span class="inline-flex items-center gap-1.5">
                  <MapPin size={15} strokeWidth={2.4} />
                  {activity.location}
                </span>
                <ArrowLeftRight size={14} strokeWidth={2.4} class="text-[#c4c4c4]" />
                <span class="inline-flex items-center gap-1.5">
                  <Timer size={15} strokeWidth={2.4} />
                  {activity.duration}
                </span>
              </div>

              <div class="mt-4 flex items-center justify-between gap-4 border-t border-[#11111110] pt-4">
                <a class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#315b3f] px-4 text-[13px] font-extrabold text-[#fff5ca] transition hover:bg-[#244631]" href="/tours">
                  Book Now
                  <ArrowUpRight size={16} strokeWidth={2.6} />
                </a>

                <div class="text-right leading-none">
                  <p class="text-[11px] font-bold uppercase tracking-wide text-[#888888]">{activity.priceLabel}</p>
                  <p class="mt-1 text-[22px] font-extrabold leading-none text-[#101010]">${activity.price}</p>
                </div>
              </div>
            </div>
          </article>
        {/each}
      </div>
    </div>

    <div class="mt-9 flex items-center justify-center gap-3" aria-label="Popular activities slider pagination">
      {#each Array(pageCount) as _, index}
        <button
          class={`h-3 rounded-full transition ${page === index ? 'w-9 bg-[#315b3f]' : 'w-3 bg-[#d3d3d3]'}`}
          type="button"
          aria-label={`Show activity slide ${index + 1}`}
          aria-current={page === index ? 'true' : 'false'}
          on:click={() => goTo(index)}
        ></button>
      {/each}
    </div>
  </div>
</section>

<style>
  .activity-track {
    display: grid;
    gap: 24px;
    grid-auto-columns: 100%;
    grid-auto-flow: column;
  }

  .activity-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(17, 17, 17, 0.08);
    border-radius: 16px;
    background: white;
    box-shadow: 0 10px 26px rgba(15, 25, 40, 0.06);
  }

  .activity-badge {
    position: absolute;
    right: 16px;
    top: 18px;
    display: inline-flex;
    min-height: 34px;
    align-items: center;
    border-radius: 999px;
    padding: 0 18px;
    font-size: 14px;
    font-weight: 800;
    color: #101010;
  }

  .activity-badge-red {
    background: #ff513f;
    color: white;
  }

  .activity-badge-yellow {
    background: #ffe947;
  }

  @media (min-width: 700px) {
    .activity-track {
      grid-auto-columns: calc((100% - 24px) / 2);
    }
  }

  @media (min-width: 1024px) {
    .activity-track {
      gap: 28px;
      grid-auto-columns: calc((100% - 56px) / 3);
    }
  }
</style>
