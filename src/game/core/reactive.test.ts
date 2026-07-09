import { describe, expect, it, vi } from 'vitest';
import { signal } from './reactive';

describe('signal', () => {
  it('reads the initial value', () => {
    const s = signal(42);
    expect(s()).toBe(42);
  });

  it('set() updates the value', () => {
    const s = signal('a');
    s.set('b');
    expect(s()).toBe('b');
  });

  it('update() derives the next value from the current one', () => {
    const s = signal(10);
    s.update(v => v + 5);
    expect(s()).toBe(15);
  });

  it('notifies subscribers on change', () => {
    const s = signal(0);
    const listener = vi.fn();
    s.subscribe(listener);
    s.set(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('skips notification when the value is unchanged (Object.is)', () => {
    const s = signal(1);
    const listener = vi.fn();
    s.subscribe(listener);
    s.set(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe stops notifications', () => {
    const s = signal(0);
    const listener = vi.fn();
    const unsubscribe = s.subscribe(listener);
    unsubscribe();
    s.set(2);
    expect(listener).not.toHaveBeenCalled();
  });
});
