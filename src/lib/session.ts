/** The type of a Pomodoro session. */
export type SessionKind = "focus" | "shortBreak" | "longBreak";

/** All session types, in the order the interface shows them. */
export const SESSION_KINDS: readonly SessionKind[] = ["focus", "shortBreak", "longBreak"];

const MINUTE_MS = 60 * 1000;

/** The planned duration of each session type, in milliseconds. */
export const SESSION_DURATION_MS: Readonly<Record<SessionKind, number>> = {
  focus: 25 * MINUTE_MS,
  shortBreak: 5 * MINUTE_MS,
  longBreak: 15 * MINUTE_MS,
};

/** The label that the interface shows for each session type. */
export const SESSION_LABEL: Readonly<Record<SessionKind, string>> = {
  focus: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

/** The number of completed focus sessions before a long break. */
export const FOCUS_SESSIONS_PER_LONG_BREAK = 4;

/**
 * Returns the session type that follows a completed session.
 *
 * @param kind - The type of the session that ended.
 * @param completedFocus - The number of completed focus sessions, including the session that ended.
 * @returns The next session type.
 */
export function nextSessionKind(kind: SessionKind, completedFocus: number): SessionKind {
  if (kind !== "focus") {
    return "focus";
  }
  if (completedFocus > 0 && completedFocus % FOCUS_SESSIONS_PER_LONG_BREAK === 0) {
    return "longBreak";
  }
  return "shortBreak";
}

/**
 * Formats a duration as `MM:SS`. The function rounds up to the next full second.
 *
 * @param ms - The duration in milliseconds.
 * @returns The formatted duration, for example `24:13`.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
