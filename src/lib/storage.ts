/**
 * Browser storage for the session history. This is the only module that
 * reads or writes `localStorage`.
 */
import { MAX_HISTORY_RECORDS, isSessionRecord, type SessionRecord } from "./history";

/** The `localStorage` key for the session history. */
export const HISTORY_STORAGE_KEY = "pomodoro.history";

const EMPTY_HISTORY: readonly SessionRecord[] = Object.freeze([]);

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedHistory: readonly SessionRecord[] = EMPTY_HISTORY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(HISTORY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseHistory(raw: string | null): readonly SessionRecord[] {
  if (raw === null) {
    return EMPTY_HISTORY;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return EMPTY_HISTORY;
    }
    return data
      .filter(isSessionRecord)
      .sort((a, b) => a.endedAt - b.endedAt)
      .slice(-MAX_HISTORY_RECORDS);
  } catch {
    return EMPTY_HISTORY;
  }
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Reads the history from `localStorage`. Returns an empty history if the data
 * is missing or not valid. Returns the same array while the stored data does
 * not change.
 *
 * @returns The stored history.
 */
export function loadHistory(): readonly SessionRecord[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedHistory = parseHistory(raw);
  }
  return cachedHistory;
}

/**
 * Returns the history to use during server rendering. This is always empty.
 *
 * @returns An empty history.
 */
export function loadServerHistory(): readonly SessionRecord[] {
  return EMPTY_HISTORY;
}

/**
 * Writes the history to `localStorage` and tells all subscribers.
 *
 * @param history - The history to store.
 */
export function saveHistory(history: readonly SessionRecord[]): void {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Storage is full or not available. Keep the app running.
  }
  notify();
}

/** Removes the history from `localStorage` and tells all subscribers. */
export function clearStoredHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // Storage is not available. Keep the app running.
  }
  notify();
}

/**
 * Subscribes to changes of the stored history, also from other tabs.
 *
 * @param listener - The function to call after a change.
 * @returns A function that removes the subscription.
 */
export function subscribeHistory(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === HISTORY_STORAGE_KEY) {
      listener();
    }
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
