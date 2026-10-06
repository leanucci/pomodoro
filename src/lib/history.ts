import { SESSION_KINDS, type SessionKind } from "./session";

/** A record of one completed session. */
export interface SessionRecord {
  /** A unique ID for the record. */
  id: string;
  /** The session type. */
  kind: SessionKind;
  /** The time when the user started the session, as epoch milliseconds. */
  startedAt: number;
  /** The time when the session ended, as epoch milliseconds. */
  endedAt: number;
  /** The planned duration of the session, in milliseconds. */
  plannedMs: number;
  /** What the user did in the session. Only focus records have a description. */
  description?: string;
}

/** A record as the storage keeps it. Records from before IDs existed have no ID. */
export type StoredRecord = Omit<SessionRecord, "id"> & { id?: unknown };

/** The maximum number of characters in a session description. */
export const MAX_DESCRIPTION_LENGTH = 100;

/** The maximum number of records that the history keeps. */
export const MAX_HISTORY_RECORDS = 500;

/**
 * Adds a record to the history. Keeps only the newest records.
 *
 * @param history - The current history.
 * @param record - The record to add.
 * @returns A new history that contains at most {@link MAX_HISTORY_RECORDS} records.
 */
export function addRecord(history: readonly SessionRecord[], record: SessionRecord): SessionRecord[] {
  return [...history, record]
    .sort((a, b) => a.endedAt - b.endedAt)
    .slice(-MAX_HISTORY_RECORDS);
}

/**
 * Removes spaces at the start and at the end of a description and keeps at
 * most {@link MAX_DESCRIPTION_LENGTH} characters.
 *
 * @param text - The text that the user typed.
 * @returns The description, or `undefined` if the text is empty.
 */
export function normalizeDescription(text: string): string | undefined {
  const description = text.trim().slice(0, MAX_DESCRIPTION_LENGTH).trim();
  return description === "" ? undefined : description;
}

/**
 * Sets the description of a record. An empty description removes the description.
 *
 * @param record - The record to change.
 * @param text - The new description text.
 * @returns A new record with the normalized description.
 */
export function withDescription(record: SessionRecord, text: string): SessionRecord {
  const updated: SessionRecord = { ...record };
  delete updated.description;
  const description = normalizeDescription(text);
  return description === undefined ? updated : { ...updated, description };
}

/**
 * Makes a new unique record ID.
 *
 * @returns A random ID.
 */
export function createRecordId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // `crypto.randomUUID` is only available in secure contexts.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Changes the description of one record in the history.
 *
 * @param history - The current history.
 * @param id - The ID of the record to change.
 * @param text - The new description text. An empty text removes the description.
 * @returns A new history. The history does not change if no record has the ID.
 */
export function updateDescription(history: readonly SessionRecord[], id: string, text: string): SessionRecord[] {
  return history.map((record) => (record.id === id ? withDescription(record, text) : record));
}

/**
 * Makes a clean record from stored data. Ignores a description that is not
 * text, but keeps the record. Gives a new ID to a record with no valid ID.
 *
 * @param record - A valid record from the storage.
 * @param usedIds - The IDs of the records that are already clean. A record
 * with an ID from this set gets a new ID.
 * @returns A record with only the known fields.
 */
export function sanitizeRecord(record: StoredRecord, usedIds: ReadonlySet<string> = new Set()): SessionRecord {
  const { kind, startedAt, endedAt, plannedMs } = record;
  const id = typeof record.id === "string" && record.id !== "" && !usedIds.has(record.id) ? record.id : createRecordId();
  const clean: SessionRecord = { id, kind, startedAt, endedAt, plannedMs };
  const description: unknown = record.description;
  return typeof description === "string" ? withDescription(clean, description) : clean;
}

/**
 * Tells if a value is a valid session record. The value does not need an ID.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a valid record.
 */
export function isSessionRecord(value: unknown): value is StoredRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    SESSION_KINDS.includes(record.kind as SessionKind) &&
    Number.isFinite(record.startedAt) &&
    Number.isFinite(record.endedAt) &&
    Number.isFinite(record.plannedMs)
  );
}

/**
 * Tells if two times are on the same local calendar day.
 *
 * @param a - The first time, as epoch milliseconds.
 * @param b - The second time, as epoch milliseconds.
 * @returns `true` if both times are on the same local day.
 */
export function isSameLocalDay(a: number, b: number): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

/**
 * Returns the records of sessions that ended today, newest first.
 *
 * @param history - The full history.
 * @param now - The current time, as epoch milliseconds.
 * @returns The records from today, newest first.
 */
export function todaysRecords(history: readonly SessionRecord[], now: number): SessionRecord[] {
  return history
    .filter((record) => isSameLocalDay(record.endedAt, now))
    .sort((a, b) => b.endedAt - a.endedAt);
}

/**
 * Counts the completed focus sessions today in the current long-break cycle.
 * The cycle starts after the newest long break of today. A skipped session has
 * no record, so it does not count.
 *
 * @param history - The full history.
 * @param now - The current time, as epoch milliseconds.
 * @returns The number of focus records today after the newest long break.
 */
export function focusSessionsInCycle(history: readonly SessionRecord[], now: number): number {
  let count = 0;
  for (const record of todaysRecords(history, now)) {
    if (record.kind === "longBreak") {
      break;
    }
    if (record.kind === "focus") {
      count += 1;
    }
  }
  return count;
}
