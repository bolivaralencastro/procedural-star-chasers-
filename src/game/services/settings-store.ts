/**
 * Tiny persistent settings store backed by localStorage.
 * All reads/writes are namespaced and fail-safe: storage errors
 * (private mode, quota) silently fall back to defaults.
 */
const PREFIX = 'star-chasers:';

export const SettingsStore = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // storage unavailable — setting stays session-only
    }
  },
};
