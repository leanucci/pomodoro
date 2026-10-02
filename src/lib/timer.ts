import { SESSION_DURATION_MS, nextSessionKind, type SessionKind } from "./session";

/** The run state of the timer. */
export type TimerStatus = "idle" | "running" | "paused";

/** The full state of the timer. */
export interface TimerState {
  /** The type of the current session. */
  kind: SessionKind;
  /** The run state of the timer. */
  status: TimerStatus;
  /** The remaining time when the timer is not running, in milliseconds. */
  remainingMs: number;
  /** The time when the session ends, as epoch milliseconds. Only set while the timer runs. */
  endTime: number | null;
  /** The time when the user first started the current session, as epoch milliseconds. */
  startedAt: number | null;
}

/** An action that changes the timer state. */
export type TimerAction =
  | { type: "start"; now: number }
  | { type: "pause"; now: number }
  | { type: "reset" }
  | { type: "skip" }
  | { type: "select"; kind: SessionKind }
  | {
      type: "complete";
      /** The number of completed focus sessions in the current cycle, including the session that ended. */
      completedFocus: number;
    };

/**
 * Returns an idle timer state for a session type.
 *
 * @param kind - The session type.
 * @returns The idle state with the full session duration.
 */
export function idleState(kind: SessionKind): TimerState {
  return {
    kind,
    status: "idle",
    remainingMs: SESSION_DURATION_MS[kind],
    endTime: null,
    startedAt: null,
  };
}

/** The timer state for a new visit: an idle focus session. */
export const INITIAL_TIMER_STATE: TimerState = idleState("focus");

/**
 * Calculates the remaining time from the end time. This stays correct when the
 * browser slows down timers in a background tab.
 *
 * @param state - The timer state.
 * @param now - The current time, as epoch milliseconds.
 * @returns The remaining time in milliseconds. The value is never negative.
 */
export function getRemainingMs(state: TimerState, now: number): number {
  if (state.status === "running" && state.endTime !== null) {
    return Math.max(0, state.endTime - now);
  }
  return state.remainingMs;
}

/**
 * Applies an action to the timer state.
 *
 * @param state - The current timer state.
 * @param action - The action to apply.
 * @returns The new timer state.
 */
export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "start":
      if (state.status === "running") {
        return state;
      }
      return {
        ...state,
        status: "running",
        endTime: action.now + state.remainingMs,
        startedAt: state.startedAt ?? action.now,
      };
    case "pause":
      if (state.status !== "running") {
        return state;
      }
      return {
        ...state,
        status: "paused",
        remainingMs: getRemainingMs(state, action.now),
        endTime: null,
      };
    case "reset":
      return idleState(state.kind);
    case "skip":
      // A skipped session does not count. A skipped focus session goes to a short break.
      return idleState(state.kind === "focus" ? "shortBreak" : "focus");
    case "select":
      return idleState(action.kind);
    case "complete":
      return idleState(nextSessionKind(state.kind, action.completedFocus));
  }
}
