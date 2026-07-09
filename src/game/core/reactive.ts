/**
 * Minimal framework-agnostic writable signal.
 *
 * Mirrors the call surface of Angular's `signal()` that this codebase uses
 * (`sig()`, `sig.set(v)`, `sig.update(fn)`), so game-core state can be read
 * from any UI layer without importing @angular/core. Subscribers are
 * optional and used by UI adapters that need change notifications.
 */
export interface WritableSignal<T> {
  (): T;
  set(value: T): void;
  update(updater: (value: T) => T): void;
  subscribe(listener: (value: T) => void): () => void;
}

export function signal<T>(initial: T): WritableSignal<T> {
  let value = initial;
  const listeners = new Set<(value: T) => void>();

  const read = (() => value) as WritableSignal<T>;

  read.set = (next: T) => {
    if (Object.is(value, next)) {
      return;
    }
    value = next;
    listeners.forEach(listener => listener(value));
  };

  read.update = (updater: (current: T) => T) => {
    read.set(updater(value));
  };

  read.subscribe = (listener: (value: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return read;
}
