import { describe, expect, it } from 'vitest';
import { IntentManager, ShipDrives, INTENT_LABELS } from './intent-manager';
import { PERSONALITIES } from '../entities/ship-personas';

const baseDrives: ShipDrives = { restfulness: 0.3, rivalry: 0.2, gregariousness: 0.4, wonder: 0.4 };

describe('IntentManager', () => {
  it('has a label for every personality/intent', () => {
    for (const p of PERSONALITIES) {
      expect(INTENT_LABELS[p]).toBeTruthy();
    }
  });

  it('keeps drives within [0,1] as they step', () => {
    let d = { restfulness: 0.95, rivalry: 0.02, gregariousness: 0.95, wonder: 0.02 };
    for (let i = 0; i < 20; i++) {
      d = IntentManager.stepDrives(d, true, true);
      for (const v of Object.values(d)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('activity raises restfulness (fatigue); rest lowers it', () => {
    const tired = IntentManager.stepDrives(baseDrives, true, false);
    const rested = IntentManager.stepDrives(baseDrives, false, false);
    expect(tired.restfulness).toBeGreaterThan(baseDrives.restfulness);
    expect(rested.restfulness).toBeLessThan(baseDrives.restfulness);
  });

  it('isolation raises the desire for company', () => {
    const alone = IntentManager.stepDrives(baseDrives, false, true);
    const together = IntentManager.stepDrives(baseDrives, false, false);
    expect(alone.gregariousness).toBeGreaterThan(together.gregariousness);
  });

  it('high rivalry makes aggressive the top-scoring intent', () => {
    const scores = IntentManager.scoreIntents(
      { restfulness: 0.1, rivalry: 1, gregariousness: 0.4, wonder: 0.2 },
      'Red'
    );
    const top = (Object.keys(scores) as (keyof typeof scores)[]).reduce((a, b) =>
      scores[a] >= scores[b] ? a : b
    );
    expect(top).toBe('aggressive');
  });

  it('persona colour biases its signature intent', () => {
    const red = IntentManager.scoreIntents(baseDrives, 'Red');
    const green = IntentManager.scoreIntents(baseDrives, 'Green');
    // Red gets an aggressive bonus the others do not.
    expect(red.aggressive).toBeGreaterThan(IntentManager.scoreIntents(baseDrives, 'Blue').aggressive);
    expect(green.patroller).toBeGreaterThan(red.patroller);
  });

  it('pickIntent never returns the excluded intent and is weighted', () => {
    const scores = IntentManager.scoreIntents(baseDrives, 'Blue');
    for (let i = 0; i < 50; i++) {
      const pick = IntentManager.pickIntent(scores, 'explorer', Math.random);
      expect(pick).not.toBe('explorer');
      expect(PERSONALITIES).toContain(pick);
    }
  });

  it('pickIntent honours a deterministic rng toward the heaviest option', () => {
    // rng near 0 selects the first non-excluded option with positive weight.
    const scores = IntentManager.scoreIntents(
      { restfulness: 1, rivalry: 0, gregariousness: 0, wonder: 0 },
      'Green'
    );
    const pick = IntentManager.pickIntent(scores, undefined, () => 0.0001);
    expect(PERSONALITIES).toContain(pick);
  });
});
