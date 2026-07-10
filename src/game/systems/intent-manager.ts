import { ShipColor, ShipPersonality, PERSONALITIES } from '../entities/ship-personas';

/**
 * Utility-AI "intent engine".
 *
 * Replaces the old timer + `Math.random()` personality roulette with something
 * that makes the ships feel like they have their own agenda: each ship carries
 * a set of slow-moving drives that grow and fade with what happens around it,
 * and periodically re-picks an intent by scoring the options against those
 * drives and its persona. The five existing personalities double as the
 * intents (they already have movement behaviours), so this only changes *how*
 * an intent is chosen and surfaces a label for the HUD.
 *
 * The scoring and drive maths are pure functions so they can be unit-tested.
 */

export interface ShipDrives {
  /** Fatigue from being active; high → wants calm (recuar/patrulhar). */
  restfulness: number;
  /** Desire to outdo rivals; rises when others score. */
  rivalry: number;
  /** Desire for company; rises when isolated. */
  gregariousness: number;
  /** Pull toward novelty; rises on new events (wormhole, nebula, visitor). */
  wonder: number;
}

/** Human-readable, persona-agnostic label for the current intent (for the HUD). */
export const INTENT_LABELS: Record<ShipPersonality, string> = {
  explorer: 'Explorando',
  aggressive: 'Caçando rivais',
  timid: 'Recuando',
  loner: 'Buscando solidão',
  patroller: 'Patrulhando',
};

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export const IntentManager = {
  initDrives(): ShipDrives {
    // Start slightly varied so ships don't all pick the same first intent.
    return {
      restfulness: 0.2 + Math.random() * 0.2,
      rivalry: 0.1 + Math.random() * 0.2,
      gregariousness: 0.3 + Math.random() * 0.3,
      wonder: 0.3 + Math.random() * 0.3,
    };
  },

  /**
   * Advances drives one selection step. `active` means the ship has been busy
   * (hunting/celebrating/launched/orbiting); `isolated` means no ally is near.
   * Pure: returns a new drives object.
   */
  stepDrives(drives: ShipDrives, active: boolean, isolated: boolean): ShipDrives {
    return {
      restfulness: clamp01(drives.restfulness + (active ? 0.15 : -0.12)),
      gregariousness: clamp01(drives.gregariousness + (isolated ? 0.12 : -0.14)),
      // Novelty and rivalry cool off over time; events top them back up.
      wonder: clamp01(drives.wonder - 0.08),
      rivalry: clamp01(drives.rivalry - 0.06),
    };
  },

  /**
   * Scores each personality/intent from the drives and the ship's persona.
   * Higher is more appealing. Pure.
   */
  scoreIntents(drives: ShipDrives, color: ShipColor): Record<ShipPersonality, number> {
    const redBias = color === 'Red' ? 0.3 : 0;
    const greenBias = color === 'Green' ? 0.25 : 0;
    const blueBias = color === 'Blue' ? 0.25 : 0;
    return {
      explorer: 0.35 + drives.wonder * 0.5 + drives.gregariousness * 0.3 + blueBias,
      aggressive: 0.15 + drives.rivalry * 0.9 + redBias,
      timid: 0.1 + drives.restfulness * 0.5,
      loner: 0.15 + (1 - drives.gregariousness) * 0.6 + blueBias,
      patroller: 0.3 + drives.restfulness * 0.2 + greenBias,
    };
  },

  /**
   * Weighted-random pick over the scores (not a hard argmax) so behaviour stays
   * organic. `rng` defaults to Math.random; injectable for tests.
   */
  pickIntent(
    scores: Record<ShipPersonality, number>,
    exclude?: ShipPersonality,
    rng: () => number = Math.random
  ): ShipPersonality {
    const options = PERSONALITIES.filter(p => p !== exclude);
    const total = options.reduce((sum, p) => sum + Math.max(0, scores[p]), 0);
    if (total <= 0) {
      return options[Math.floor(rng() * options.length)];
    }
    let roll = rng() * total;
    for (const p of options) {
      roll -= Math.max(0, scores[p]);
      if (roll <= 0) {
        return p;
      }
    }
    return options[options.length - 1];
  },

  /** Milliseconds until the next intent re-evaluation (5–8s). */
  nextIntentDelay(): number {
    return 5000 + Math.random() * 3000;
  },
};
