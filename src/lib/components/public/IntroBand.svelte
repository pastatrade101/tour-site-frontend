<script lang="ts">
	import { fadeUpOnScroll } from '$lib/animations';

	export let eyebrow = 'Real people, real Tanzania';
	export let title =
		'Not a booking platform. A team of Tanzanians who built this from the ground up.';
	export let body =
		'We are local specialists who plan honest, tailor-made journeys — not a faceless checkout. Share what matters to you and we shape a confident itinerary around your dates, pace and budget, with no pressure and no payment to start.';
	export let stats: Array<{ value: string; label: string }> = [
		{ value: '23+', label: 'Years of local expertise' },
		{ value: '10%', label: 'Reinvested in conservation' },
		{ value: '17', label: 'National parks covered' }
	];
</script>

<section class="bg-canvas py-16 md:py-24" use:fadeUpOnScroll>
	<div class="container-shell">
		<div class="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
			<!-- LEFT -->
			<div>
				<p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">
					{eyebrow}
				</p>
				<h2 class="mt-3 max-w-xl text-3xl font-semibold leading-tight text-heading md:text-[38px]">
					{title}
				</h2>
				<p class="mt-5 max-w-xl leading-8 text-ink/70">
					{body}
				</p>
			</div>

			<!-- RIGHT -->
			<div class="rounded-2xl border border-ink/10 bg-surface p-8 shadow-soft">
				{#each stats as stat, i}
					<div class={i === 0 ? '' : 'mt-5 border-t border-ink/10 pt-5'}>
						<h3 class="text-4xl font-semibold text-goldfinch-gold">{stat.value}</h3>
						<p class="mt-1 text-sm font-medium text-ink/60">{stat.label}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>
