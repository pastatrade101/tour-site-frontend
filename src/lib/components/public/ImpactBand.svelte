<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { fadeUpOnScroll } from '$lib/animations';

	export let eyebrow = 'Our impact';
	export let title = 'Every Safari You Book Creates Change';
	export let body =
		'Travel done right protects the places and people that make Tanzania extraordinary. A share of every trip funds conservation and local communities.';
	export let points: Array<{ title: string; body: string }> = [
		{
			title: 'Community support',
			body: 'A share of every trip funds local schools, water and community projects.'
		},
		{
			title: 'Conservation fees',
			body: 'Park and concession fees directly protect wildlife and wild places.'
		},
		{
			title: 'Fair local jobs',
			body: 'We hire and fairly pay Tanzanian guides, drivers and camp teams.'
		}
	];
	export let imageUrl =
		'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=1200&q=70';
	export let badge = '10%';
	export let badgeLabel = 'of every trip reinvested locally';
	export let primaryCta = 'Learn about our impact';
	export let primaryCtaUrl = '/about';
	export let secondaryCta = 'Our impact projects';
	export let secondaryCtaUrl = '/about';
</script>

<section class="bg-deep-green py-16 text-white md:py-24" use:fadeUpOnScroll>
	<div class="container-shell">
		<div class="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
			<div class="relative pb-6">
				<img
					class="aspect-[4/3] w-full rounded-2xl object-cover"
					src={imageUrl}
					alt=""
					loading="lazy"
				/>
				<div
					class="absolute -bottom-5 left-5 rounded-2xl bg-goldfinch-gold px-5 py-4 text-heading shadow-lg"
				>
					<p class="text-3xl font-semibold leading-none">{badge}</p>
					<p class="mt-1 text-xs font-semibold">{badgeLabel}</p>
				</div>
			</div>

			<div>
				<p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">
					{eyebrow}
				</p>
				<h2 class="mt-3 text-3xl font-semibold text-white md:text-[38px]">{title}</h2>
				<p class="mt-4 leading-8 text-white/80">{body}</p>

				<div class="mt-7 space-y-4">
					{#each points as p}
						<div class="flex gap-3">
							<span
								class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-goldfinch-gold/25 text-goldfinch-gold"
							>
								<Check size={13} strokeWidth={3} />
							</span>
							<div>
								<p class="font-semibold text-white">{p.title}</p>
								<p class="text-sm leading-6 text-white/70">{p.body}</p>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-8 flex flex-wrap gap-3">
					<a
						href={primaryCtaUrl}
						class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-goldfinch-gold px-7 font-bold text-heading transition hover:brightness-105"
					>
						{primaryCta}
					</a>
					<a
						href={secondaryCtaUrl}
						class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/40 px-7 font-semibold text-white transition hover:bg-white/10"
					>
						{secondaryCta}
					</a>
				</div>
			</div>
		</div>
	</div>
</section>
