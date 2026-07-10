import { describe, expect, it } from 'vitest';
import { LogbookService, StorageLike } from './logbook-store';

/** In-memory storage shared across "reloads" (fresh service instances). */
function memoryStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

describe('LogbookService', () => {
  it('starts a first-time visitor at visit 1 and not returning', () => {
    const log = LogbookService.createForTest(memoryStorage());
    expect(log.isReturning).toBe(false);
    expect(log.visitCount).toBe(1);
    expect(log.previousVisit).toBeNull();
  });

  it('persists totals and recognises a returning visitor across reloads', () => {
    const storage = memoryStorage();

    const first = LogbookService.createForTest(storage);
    first.recordStarWitnessed('Red');
    first.recordStarWitnessed('Blue');
    first.recordShipLaunched();
    first.flush();

    const second = LogbookService.createForTest(storage);
    expect(second.isReturning).toBe(true);
    expect(second.visitCount).toBe(2);
    expect(second.previousVisit).not.toBeNull();

    const snap = second.snapshot();
    expect(snap.totals.starsWitnessed.Red).toBe(1);
    expect(snap.totals.starsWitnessed.Blue).toBe(1);
    expect(snap.totals.shipsLaunched).toBe(1);
  });

  it('tracks best session as the max stars witnessed in one session', () => {
    const storage = memoryStorage();

    const first = LogbookService.createForTest(storage);
    first.recordStarWitnessed('Green');
    first.recordStarWitnessed('Green');
    first.flush();
    expect(first.snapshot().bestSession.stars).toBe(2);

    // A weaker session must not lower the record.
    const second = LogbookService.createForTest(storage);
    second.recordStarWitnessed('Green');
    second.flush();
    expect(second.snapshot().bestSession.stars).toBe(2);
  });

  it('accumulates watch time without persisting per-tick, then flushes it', () => {
    const storage = memoryStorage();
    const log = LogbookService.createForTest(storage);
    log.addWatchTime(1000);
    log.addWatchTime(500);
    log.flush();
    expect(LogbookService.createForTest(storage).snapshot().totals.watchTimeMs).toBe(1500);
  });

  it('stores an optional signature and trims/caps it', () => {
    const storage = memoryStorage();
    const log = LogbookService.createForTest(storage);
    expect(log.signature).toBeUndefined();
    log.setSignature('  Bolívar  ');
    expect(log.signature).toBe('Bolívar');
    log.setSignature('x'.repeat(50));
    expect(log.signature?.length).toBe(24);
    log.clearSignature();
    expect(log.signature).toBeUndefined();
  });

  it('keeps pair relationships symmetric and clamped', () => {
    const log = LogbookService.createForTest(memoryStorage());
    log.setRelationship(2, 0, 5);
    expect(log.getRelationship(0, 2)).toBe(1); // clamped and order-independent
    log.setRelationship(0, 1, -9);
    expect(log.getRelationship(1, 0)).toBe(-1);
  });

  it('survives corrupt storage by falling back to a fresh logbook', () => {
    const storage = memoryStorage({ 'star-chasers:logbook': '{not valid json' });
    const log = LogbookService.createForTest(storage);
    expect(log.visitCount).toBe(1);
    expect(log.isReturning).toBe(false);
  });

  it('never throws when storage is unavailable', () => {
    expect(() => {
      const log = LogbookService.createForTest(null);
      log.recordWormholeCreated();
      log.flush();
    }).not.toThrow();
  });
});
