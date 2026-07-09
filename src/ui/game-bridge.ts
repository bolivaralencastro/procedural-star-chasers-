import { createSignal, onCleanup, type Accessor } from 'solid-js';
import type { WritableSignal } from '../game/core/reactive';

/**
 * Bridges a game-core signal into Solid's reactivity so templates
 * re-render when the game writes to it.
 */
export function fromGameSignal<T>(gameSignal: WritableSignal<T>): Accessor<T> {
  const [value, setValue] = createSignal<T>(gameSignal());
  const unsubscribe = gameSignal.subscribe(next => setValue(() => next));
  onCleanup(unsubscribe);
  return value;
}

/**
 * A per-frame tick driven by the engine's notifyUi callback. UI that reads
 * live engine fields (ship positions, camera, scores) tracks `tick()` so it
 * refreshes once per game frame — Solid's fine-grained updates keep this cheap.
 */
export function createFrameTick(): { tick: Accessor<number>; bump: () => void } {
  const [tick, setTick] = createSignal(0);
  return { tick, bump: () => setTick(t => t + 1) };
}
