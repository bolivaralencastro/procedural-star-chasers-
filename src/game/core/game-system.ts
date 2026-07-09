/**
 * A named step in the fixed-timestep update pipeline.
 *
 * Adding a feature = appending a system to the pipeline in EngineUpdater;
 * existing systems stay untouched. Order matters and is explicit there.
 */
export interface GameSystem {
  readonly name: string;
  update(dt: number): void;
}
