<script lang="ts">
  /**
   * A short row of figures for a photographic hero, drawn as stops along a
   * route: one fine line, a gold waypoint where each figure begins, the
   * figure in the headline's serif and what it counts in small capitals
   * beneath. No boxes and no icons — the line is the only ornament, and it is
   * the one a safari page already speaks in.
   *
   * It only lays out what it is handed. Each page works out its own figures
   * from published records and leaves out any it cannot stand behind; with
   * nothing to show, nothing is drawn.
   */
  export let facts: Array<{ value: string; label: string }> = [];
  /** What the row is, for a screen reader. */
  export let label = '';
</script>

{#if facts.length}
  <dl style="--facts: {Math.min(facts.length, 4)}" aria-label={label || undefined}>
    {#each facts as fact (fact.label)}
      <div class="stop">
        <!-- Named before it is given, as a list of terms is read; drawn the other way round. -->
        <dt>{fact.label}</dt>
        <dd>{fact.value}</dd>
      </div>
    {/each}
  </dl>
{/if}

<style>
  /* The stops touch, so their top rules join into one line; where a row ends
     the line thins out instead of stopping dead. Two to a row where the
     column is narrow; on a wide one all of them on one line, each as wide as
     its own words need. */
  dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 1.375rem; margin: 0; }
  .stop { position: relative; display: flex; flex-direction: column-reverse; justify-content: flex-end; min-width: 0; padding: 0.875rem 1.25rem 0 0; border-top: 1px solid rgb(255 255 255 / 0.3); }
  .stop::before { content: ''; position: absolute; top: -4px; left: 0; width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--c-goldfinch-gold)); }
  .stop:nth-child(2n), .stop:last-child { border-image: linear-gradient(90deg, rgb(255 255 255 / 0.3), rgb(255 255 255 / 0)) 1; }
  dd { margin: 0; color: #fff; font-family: "Source Serif 4", Georgia, serif; font-size: 1.5rem; font-weight: 500; line-height: 1.1; letter-spacing: -0.01em; }
  dt { margin-top: 0.375rem; color: rgb(255 255 255 / 0.7); font-size: 0.65625rem; font-weight: 500; letter-spacing: 0.1em; line-height: 1.35; text-transform: uppercase; }
  @media (min-width: 1280px) {
    dl { grid-template-columns: repeat(var(--facts), auto); row-gap: 0; }
    .stop:nth-child(2n) { border-image: none; }
    .stop:last-child { border-image: linear-gradient(90deg, rgb(255 255 255 / 0.3), rgb(255 255 255 / 0)) 1; }
    dd { font-size: 1.625rem; }
  }
</style>
