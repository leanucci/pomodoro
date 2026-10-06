/**
 * Browser storage for the session history. This is the only module that
 * reads or writes `localStorage`.
 */
import { MAX_HISTORY_RECORDS, isSessionRecord, sanitizeRecord, type SessionRecord } from "./history";

/** The `localStorage` key for the session history. */
export const HISTORY_STORAGE_KEY = "pomodoro.history";

const EMPTY_HISTORY: readonly SessionRecord[] = Object.freeze([]);

/** A key to check if the browser lets the app write to `localStorage`. */
const PROBE_KEY = "pomodoro.probe";

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedHistory: readonly SessionRecord[] = EMPTY_HISTORY;
/** The history in memory. Only set after a write to `localStorage` fails. */
let memoryHistory: readonly SessionRecord[] | null = null;
/** The result of the last storage check. `null` means "not checked". */
let storageAvailable: boolean | null = null;

function probeStorage(): boolean {
  try {
    window.localStorage.setItem(PROBE_KEY, PROBE_KEY);
    window.localStorage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

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
      .map(sanitizeRecord)
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
 * not change. If a write failed, returns the history in memory.
 *
 * @returns The stored history.
 */
export function loadHistory(): readonly SessionRecord[] {
  if (memoryHistory !== null) {
    return memoryHistory;
  }
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
 * Tells if the app can save the history in `localStorage`. The result is
 * cached. Each new subscription and each write updates it.
 *
 * @returns `true` if the app can save the history.
 */
export function isStorageAvailable(): boolean {
  if (storageAvailable === null) {
    storageAvailable = probeStorage();
  }
  return storageAvailable;
}

/**
 * Tells if the app can save the history during server rendering. This is
 * always `true`, so the server does not show the storage notice.
 *
 * @returns `true`.
 */
export function isServerStorageAvailable(): boolean {
  return true;
}

/**
 * Writes the history to `localStorage` and tells all subscribers. If the write
 * fails, keeps the history in memory for the current visit.
 *
 * @param history - The history to store.
 */
export function saveHistory(history: readonly SessionRecord[]): void {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    memoryHistory = null;
    storageAvailable = true;
  } catch {
    // Storage is full or not available. Keep the history in memory.
    memoryHistory = Object.freeze([...history]);
    storageAvailable = false;
  }
  notify();
}

/** Removes the history from `localStorage` and from memory, and tells all subscribers. */
export function clearStoredHistory(): void {
  memoryHistory = null;
  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // Storage is not available. Keep the app running.
    storageAvailable = false;
  }
  notify();
}

/**
 * Subscribes to changes of the stored history, also from other tabs. A new
 * subscription checks the storage again.
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
  storageAvailable = null;
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
