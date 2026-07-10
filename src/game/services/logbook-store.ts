import { ShipColor } from '../entities/ship-personas';
import { signal, WritableSignal } from '../core/reactive';

/**
 * The visitor's persistent "diário de bordo" (logbook).
 *
 * This is the continuity layer: nothing here identifies a person, there is no
 * account and no network. The logbook simply *belongs to the browser* — totals
 * accumulate across visits so the ships can recognise a returning watcher, and
 * the visitor may optionally sign it with a name for the ships to use.
 *
 * Storage is a single namespaced localStorage key, written in aggregate (on an
 * interval and on tab-hide) rather than on every event, and fully fail-safe:
 * private mode / quota errors degrade to a session-only in-memory logbook.
 */
export interface LogbookTotals {
  watchTimeMs: number;
  starsWitnessed: Record<ShipColor, number>;
  shipsLaunched: number;
  wormholesCreated: number;
  rescuesWitnessed: number;
  asteroidsDestroyedWatched: number;
  racesWitnessed: number;
}

export interface Logbook {
  schemaVersion: number;
  /** Optional name the visitor chose to sign with; used only in ship chatter. */
  signature?: string;
  firstVisitAt: string;
  lastSeenAt: string;
  visitCount: number;
  patronShipColor?: ShipColor;
  totals: LogbookTotals;
  /** Affinity between ship pairs, keyed "A-B" (sorted). Filled by M3. */
  relationships: Record<string, number>;
  bestSession: { stars: number; date: string };
}

const STORAGE_KEY = 'star-chasers:logbook';
const SCHEMA_VERSION = 1;

function emptyTotals(): LogbookTotals {
  return {
    watchTimeMs: 0,
    starsWitnessed: { Red: 0, Green: 0, Blue: 0 },
    shipsLaunched: 0,
    wormholesCreated: 0,
    rescuesWitnessed: 0,
    asteroidsDestroyedWatched: 0,
    racesWitnessed: 0,
  };
}

function freshLogbook(now: string): Logbook {
  return {
    schemaVersion: SCHEMA_VERSION,
    firstVisitAt: now,
    lastSeenAt: now,
    visitCount: 0,
    totals: emptyTotals(),
    relationships: {},
    bestSession: { stars: 0, date: now },
  };
}

/**
 * Coerces whatever was in storage into a valid current-schema Logbook.
 * Tolerant of missing/renamed fields so old logbooks survive upgrades.
 */
function migrate(raw: unknown, now: string): Logbook {
  const base = freshLogbook(now);
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const data = raw as Partial<Logbook>;
  const totals = (data.totals ?? {}) as Partial<LogbookTotals>;
  const starsWitnessed = (totals.starsWitnessed ?? {}) as Partial<Record<ShipColor, number>>;

  return {
    schemaVersion: SCHEMA_VERSION,
    signature: typeof data.signature === 'string' ? data.signature : undefined,
    firstVisitAt: typeof data.firstVisitAt === 'string' ? data.firstVisitAt : now,
    lastSeenAt: typeof data.lastSeenAt === 'string' ? data.lastSeenAt : now,
    visitCount: Number.isFinite(data.visitCount) ? (data.visitCount as number) : 0,
    patronShipColor: data.patronShipColor,
    totals: {
      watchTimeMs: num(totals.watchTimeMs),
      starsWitnessed: {
        Red: num(starsWitnessed.Red),
        Green: num(starsWitnessed.Green),
        Blue: num(starsWitnessed.Blue),
      },
      shipsLaunched: num(totals.shipsLaunched),
      wormholesCreated: num(totals.wormholesCreated),
      rescuesWitnessed: num(totals.rescuesWitnessed),
      asteroidsDestroyedWatched: num(totals.asteroidsDestroyedWatched),
      racesWitnessed: num(totals.racesWitnessed),
    },
    relationships:
      data.relationships && typeof data.relationships === 'object' ? { ...data.relationships } : {},
    bestSession:
      data.bestSession && typeof data.bestSession === 'object'
        ? { stars: num(data.bestSession.stars), date: data.bestSession.date ?? now }
        : { stars: 0, date: now },
  };
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Minimal slice of the Storage API the logbook needs; lets tests inject a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export class LogbookService {
  private static instance: LogbookService | null = null;

  static get shared(): LogbookService {
    return (LogbookService.instance ??= new LogbookService());
  }

  /** Fresh instance over an injected storage — for tests only. */
  static createForTest(storage: StorageLike | null): LogbookService {
    return new LogbookService(storage);
  }

  private readonly storage: StorageLike | null;
  private data: Logbook;
  /** The lastSeenAt from *before* this visit — used for the return greeting. */
  private readonly previousVisitAt: string | null;
  private readonly returning: boolean;
  private sessionStars = 0;

  /** Bumps whenever the logbook changes, so UI panels can re-read the snapshot. */
  public readonly revision: WritableSignal<number> = signal(0);

  private constructor(storage: StorageLike | null = defaultStorage()) {
    this.storage = storage;
    const now = new Date().toISOString();
    const loaded = this.read();
    this.previousVisitAt = loaded?.lastSeenAt ?? null;
    this.returning = (loaded?.visitCount ?? 0) > 0;

    this.data = migrate(loaded, now);
    this.data.visitCount += 1;
    this.data.lastSeenAt = now;
    this.write();
  }

  /** True when this browser has opened the toy before. */
  get isReturning(): boolean {
    return this.returning;
  }

  get previousVisit(): string | null {
    return this.previousVisitAt;
  }

  get visitCount(): number {
    return this.data.visitCount;
  }

  get signature(): string | undefined {
    return this.data.signature;
  }

  get patronShipColor(): ShipColor | undefined {
    return this.data.patronShipColor;
  }

  /** Immutable-ish view for the diary panel. */
  snapshot(): Logbook {
    return structuredClone(this.data);
  }

  // --- Event recording (mutates in-memory; persisted lazily via flush) ---

  recordStarWitnessed(color: ShipColor): void {
    this.data.totals.starsWitnessed[color] += 1;
    this.sessionStars += 1;
    if (this.sessionStars > this.data.bestSession.stars) {
      this.data.bestSession = { stars: this.sessionStars, date: new Date().toISOString() };
    }
    this.touch();
  }

  recordShipLaunched(): void {
    this.data.totals.shipsLaunched += 1;
    this.touch();
  }

  recordWormholeCreated(): void {
    this.data.totals.wormholesCreated += 1;
    this.touch();
  }

  recordRescueWitnessed(): void {
    this.data.totals.rescuesWitnessed += 1;
    this.touch();
  }

  recordAsteroidDestroyed(): void {
    this.data.totals.asteroidsDestroyedWatched += 1;
    this.touch();
  }

  recordRaceWitnessed(): void {
    this.data.totals.racesWitnessed += 1;
    this.touch();
  }

  /** Accumulate active watch time (call only while the tab is visible). */
  addWatchTime(ms: number): void {
    if (ms <= 0) return;
    this.data.totals.watchTimeMs += ms;
    // No touch(): watch-time ticks would spam listeners; flush() still persists it.
  }

  setSignature(name: string): void {
    const trimmed = name.trim().slice(0, 24);
    this.data.signature = trimmed.length > 0 ? trimmed : undefined;
    this.flush();
  }

  clearSignature(): void {
    this.data.signature = undefined;
    this.flush();
  }

  setPatron(color: ShipColor | undefined): void {
    this.data.patronShipColor = color;
    this.flush();
  }

  getRelationship(a: number, b: number): number {
    return this.data.relationships[relKey(a, b)] ?? 0;
  }

  setRelationship(a: number, b: number, value: number): void {
    this.data.relationships[relKey(a, b)] = clamp(value, -1, 1);
  }

  /** Persist current state to storage. Safe to call frequently. */
  flush(): void {
    this.data.lastSeenAt = new Date().toISOString();
    this.write();
    this.revision.update(v => v + 1);
  }

  private touch(): void {
    this.revision.update(v => v + 1);
  }

  private read(): Partial<Logbook> | null {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY) ?? null;
      return raw === null ? null : (JSON.parse(raw) as Partial<Logbook>);
    } catch {
      return null;
    }
  }

  private write(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // storage unavailable — logbook stays session-only
    }
  }
}

function relKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
