import { SESSION_KINDS, type SessionKind } from "./session";

/** A record of one completed session. */
export interface SessionRecord {
  /** The session type. */
  kind: SessionKind;
  /** The time when the user started the session, as epoch milliseconds. */
  startedAt: number;
  /** The time when the session ended, as epoch milliseconds. */
  endedAt: number;
  /** The planned duration of the session, in milliseconds. */
  plannedMs: number;
}

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
 * Tells if a value is a valid session record.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a valid record.
 */
export function isSessionRecord(value: unknown): value is SessionRecord {
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
