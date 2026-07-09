import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RadioChatterService } from './radio-chatter.service';

describe('RadioChatterService', () => {
  let service: RadioChatterService;

  beforeEach(() => {
    service = new RadioChatterService();
  });

  it('returns a line for a known color/context pair', () => {
    const line = service.takeLine('Red', 'launch');
    expect(typeof line).toBe('string');
    expect((line as string).length).toBeGreaterThan(0);
  });

  it('enforces the per-context cooldown', () => {
    const first = service.takeLine('Red', 'launch');
    expect(first).not.toBeNull();
    // Immediately asking again must hit the cooldown window
    const second = service.takeLine('Red', 'launch');
    expect(second).toBeNull();
  });

  it('rotates through the pool without immediate repeats', () => {
    vi.useFakeTimers();
    try {
      const seen: string[] = [];
      // Advance past the cooldown between takes; collect a few lines
      for (let i = 0; i < 4; i++) {
        const line = service.takeLine('Green', 'star_capture');
        if (line) {
          seen.push(line);
        }
        vi.advanceTimersByTime(20_000);
      }
      // Consecutive lines should differ while the pool still has variety
      for (let i = 1; i < seen.length; i++) {
        expect(seen[i]).not.toBe(seen[i - 1]);
      }
      expect(seen.length).toBeGreaterThan(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('message duration and global cooldown are sane', () => {
    expect(service.getMessageDuration()).toBeGreaterThan(0);
    const cooldown = service.getGlobalCooldown();
    expect(cooldown).toBeGreaterThanOrEqual(3200);
    expect(cooldown).toBeLessThanOrEqual(5200);
  });
});
