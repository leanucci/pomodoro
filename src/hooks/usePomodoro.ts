"use client";

import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react";
import { addRecord, focusSessionsInCycle, todaysRecords, type SessionRecord } from "@/lib/history";
import { SESSION_DURATION_MS } from "@/lib/session";
import { playChime, unlockAudio } from "@/lib/sound";
import {
  clearStoredHistory,
  loadHistory,
  loadServerHistory,
  saveHistory,
  subscribeHistory,
} from "@/lib/storage";
import { INITIAL_TIMER_STATE, getRemainingMs, timerReducer, type TimerState } from "@/lib/timer";

/** The interval between screen updates while the timer runs, in milliseconds. */
const TICK_MS = 250;

/** The value that {@link usePomodoro} returns. */
export interface Pomodoro {
  /** The timer state. */
  timer: TimerState;
  /** The remaining time of the current session, in milliseconds. */
  remainingMs: number;
  /** The completed sessions from today, newest first. */
  today: SessionRecord[];
  /** The number of completed focus sessions today. */
  todayFocusCount: number;
  /** The number of records in the full history. */
  historySize: number;
  /** Starts the timer, or resumes it after a pause. */
  start: () => void;
  /** Pauses the timer. */
  pause: () => void;
  /** Starts the timer if it does not run. Pauses it if it runs. */
  toggle: () => void;
  /** Stops the timer and sets the full duration of the current session. */
  reset: () => void;
  /** Ends the current session with no record and selects the next session. */
  skip: () => void;
  /** Stops the timer and selects a session type. */
  select: (kind: TimerState["kind"]) => void;
  /** Removes all records from the history. */
  clearHistory: () => void;
}

/**
 * Runs the Pomodoro timer and keeps the session history.
 *
 * @returns The timer state, today's history, and the controls.
 */
export function usePomodoro(): Pomodoro {
  const [timer, dispatch] = useReducer(timerReducer, INITIAL_TIMER_STATE);
  const [now, setNow] = useState(() => Date.now());
  const history = useSyncExternalStore(subscribeHistory, loadHistory, loadServerHistory);

  useEffect(() => {
    if (timer.status !== "running" || timer.endTime === null || timer.startedAt === null) {
      return;
    }
    const { endTime, startedAt, kind } = timer;
    let done = false;

    const tick = () => {
      if (done) {
        return;
      }
      const current = Date.now();
      if (current < endTime) {
        setNow(current);
        return;
      }
      done = true;
      const updated = addRecord(loadHistory(), {
        kind,
        startedAt,
        endedAt: endTime,
        plannedMs: SESSION_DURATION_MS[kind],
      });
      saveHistory(updated);
      playChime();
      setNow(current);
      dispatch({ type: "complete", completedFocus: focusSessionsInCycle(updated, endTime) });
    };

    const interval = window.setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      done = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [timer]);

  const start = useCallback(() => {
    unlockAudio();
    const current = Date.now();
    setNow(current);
    dispatch({ type: "start", now: current });
  }, []);

  const pause = useCallback(() => {
    const current = Date.now();
    setNow(current);
    dispatch({ type: "pause", now: current });
  }, []);

  const toggle = useCallback(() => {
    if (timer.status === "running") {
      pause();
    } else {
      start();
    }
  }, [timer.status, pause, start]);

  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const skip = useCallback(() => dispatch({ type: "skip" }), []);
  const select = useCallback((kind: TimerState["kind"]) => dispatch({ type: "select", kind }), []);
  const clearHistory = useCallback(() => clearStoredHistory(), []);

  const today = useMemo(() => todaysRecords(history, now), [history, now]);
  const todayFocusCount = today.filter((record) => record.kind === "focus").length;

  return {
    timer,
    remainingMs: getRemainingMs(timer, now),
    today,
    todayFocusCount,
    historySize: history.length,
    start,
    pause,
    toggle,
    reset,
    skip,
    select,
    clearHistory,
  };
}
