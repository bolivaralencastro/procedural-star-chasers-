import { Injectable } from '@angular/core';
import { ShipColor } from '../models/ship-personas';
import { RadioContext } from '../models/radio-chatter';
import { RED_LINES } from '../data/radio-chatter/red-lines';
import { GREEN_LINES } from '../data/radio-chatter/green-lines';
import { BLUE_LINES } from '../data/radio-chatter/blue-lines';

export type { RadioContext };

type LinePools = Record<ShipColor, Record<RadioContext, string[]>>;

@Injectable({ providedIn: 'root' })
export class RadioChatterService {
  private readonly messageDuration = 4500;
  private readonly globalCooldownRange: [number, number] = [3200, 5200];
  private readonly contextCooldowns: Record<RadioContext, [number, number]> = {
    proximity: [9000, 14000],
    star_capture: [7000, 11000],
    meteor_event: [12000, 15000],
    paralyzed: [8000, 13000],
    rescue: [8000, 13000],
    launch: [6000, 11000],
    philosophical: [300000, 600000], // 5-10 minutes for rare philosophical moments
    hunting: [10000, 15000],
    star_spawn: [8000, 12000],
    asteroid_warning: [10000, 15000],
    asteroid_clear: [8000, 12000],
    wormhole_shuffle: [9000, 14000],
    supernova: [12000, 18000],
    fire: [5000, 8000],
    chasing: [10000, 15000],
  };

  private readonly linePools: LinePools = {
    Red: RED_LINES,
    Green: GREEN_LINES,
    Blue: BLUE_LINES,
  };

  private readonly rotationQueues = new Map<string, string[]>();
  private readonly nextAllowedTimes = new Map<string, number>();

  takeLine(color: ShipColor, context: RadioContext): string | null {
    const now = Date.now();
    const key = `${color}-${context}`;
    const cooldown = this.contextCooldowns[context];
    const availableAt = this.nextAllowedTimes.get(key) ?? 0;
    if (now < availableAt) {
      return null;
    }

    const pool = this.linePools[color]?.[context];
    if (!pool || pool.length === 0) {
      return null;
    }

    const queue = this.rotationQueues.get(key) ?? this.shuffle([...pool]);
    const line = queue.shift();
    this.rotationQueues.set(key, queue.length > 0 ? queue : this.shuffle([...pool]));

    if (!line) {
      return null;
    }

    this.nextAllowedTimes.set(key, now + this.randomInRange(cooldown));

    return line;
  }

  getMessageDuration(): number {
    return this.messageDuration;
  }

  getGlobalCooldown(): number {
    return this.randomInRange(this.globalCooldownRange);
  }

  private randomInRange([min, max]: [number, number]): number {
    return min + Math.random() * (max - min);
  }

  private shuffle<T>(items: T[]): T[] {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
