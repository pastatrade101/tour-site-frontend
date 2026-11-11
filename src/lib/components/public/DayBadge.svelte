<script lang="ts">
  import { t } from '$lib/i18n/ui';
  /**
   * The calendar tile that stands for "Day 3" — in the day-by-day list, the
   * snapshot rows and on the accommodation cards.
   *
   * One component so the three cannot drift: the day number is the thing a
   * reader scans for, and it should look the same wherever it appears.
   */
  export let day: number | string;
  /** The colour of the place the day is spent in. Left out, the tile is brand green. */
  export let colour = '';
  /** lg: day cards. md: snapshot rows. sm: the chips on a photograph. */
  export let size: 'lg' | 'md' | 'sm' = 'lg';
  /** Gold strip with dark text, for a chip that sits on a photograph. */
  export let gold = false;
</script>

<span class={`day-badge day-badge-${size} ${gold ? 'day-badge-gold' : ''}`} style={colour && !gold ? `--day-colour:${colour}` : undefined}>
  <span class="day-badge-top">{$t('ui.day')}</span>
  <span class="day-badge-num font-serif">{day}</span>
</span>

<style>
  .day-badge {
    --day-colour: rgb(var(--c-deep-green));
    display: block;
    flex: none;
    overflow: hidden;
    width: 76px;
    border: 2px solid var(--day-colour);
    border-radius: 12px;
    background: rgb(var(--c-surface));
    text-align: center;
  }

  .day-badge-top {
    display: block;
    overflow: hidden;
    padding: 4px 2px 3px;
    background: var(--day-colour);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    line-height: 1.2;
    text-overflow: clip;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .day-badge-num {
    display: block;
    padding: 2px 0 4px;
    color: rgb(var(--c-heading));
    font-size: 32px;
    font-weight: 700;
    line-height: 1.15;
  }

  .day-badge-md {
    width: 62px;
  }

  .day-badge-md .day-badge-num {
    font-size: 26px;
  }

  .day-badge-sm {
    width: 46px;
    border: 0;
    border-radius: 9px;
    box-shadow: 0 6px 14px -6px rgb(0 0 0 / 0.6);
  }

  .day-badge-sm .day-badge-top {
    padding: 3px 1px 2px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
  }

  .day-badge-sm .day-badge-num {
    padding: 1px 0 3px;
    font-size: 20px;
    line-height: 1.2;
  }

  /* Dark text on the gold strip: white on gold is 2:1 and cannot be read. */
  .day-badge-gold {
    --day-colour: rgb(var(--c-goldfinch-gold));
  }

  .day-badge-gold .day-badge-top {
    color: rgb(var(--c-deep-green));
  }

  @media (max-width: 767px) {
    .day-badge-lg {
      width: 60px;
      border-radius: 11px;
    }

    .day-badge-lg .day-badge-top {
      font-size: 10px;
    }

    .day-badge-lg .day-badge-num {
      font-size: 26px;
    }

    .day-badge-md {
      width: 54px;
    }

    .day-badge-md .day-badge-num {
      font-size: 23px;
    }
  }
</style>
