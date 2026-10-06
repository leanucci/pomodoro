"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import {
  MAX_DESCRIPTION_LENGTH,
  addRecord,
  createRecordId,
  focusSessionsInCycle,
  todaysRecords,
  updateDescription,
  withDescription,
  type SessionRecord,
} from "@/lib/history";
import { SESSION_DURATION_MS } from "@/lib/session";
import { playChime, unlockAudio } from "@/lib/sound";
import {
  clearStoredHistory,
  isServerStorageAvailable,
  isStorageAvailable,
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
  /** `false` if the app cannot save the history in the browser storage. */
  storageAvailable: boolean;
  /** The description text for the current focus session, as the user typed it. */
  description: string;
  /** Sets the description text for the current focus session. Keeps at most 100 characters. */
  setDescription: (text: string) => void;
  /** Changes the description of the record with an ID and saves the history immediately. */
  editDescription: (id: string, text: string) => void;
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
  const storageAvailable = useSyncExternalStore(subscribeHistory, isStorageAvailable, isServerStorageAvailable);
  const [description, setDescriptionState] = useState("");
  // The timer effect reads the description from a ref, so typing does not restart the effect.
  const descriptionRef = useRef("");

  const setDescription = useCallback((text: string) => {
    const value = text.slice(0, MAX_DESCRIPTION_LENGTH);
    descriptionRef.current = value;
    setDescriptionState(value);
  }, []);

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
      const record: SessionRecord = {
        id: createRecordId(),
        kind,
        startedAt,
        endedAt: endTime,
        plannedMs: SESSION_DURATION_MS[kind],
      };
      const updated = addRecord(
        loadHistory(),
        kind === "focus" ? withDescription(record, descriptionRef.current) : record,
      );
      saveHistory(updated);
      if (kind === "focus") {
        setDescription("");
      }
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
  }, [timer, setDescription]);

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
  const skip = useCallback(() => {
    if (timer.kind === "focus") {
      setDescription("");
    }
    dispatch({ type: "skip" });
  }, [timer.kind, setDescription]);
  const select = useCallback((kind: TimerState["kind"]) => dispatch({ type: "select", kind }), []);
  const clearHistory = useCallback(() => clearStoredHistory(), []);
  const editDescription = useCallback(
    (id: string, text: string) => saveHistory(updateDescription(loadHistory(), id, text)),
    [],
  );

  const today = useMemo(() => todaysRecords(history, now), [history, now]);
  const todayFocusCount = today.filter((record) => record.kind === "focus").length;

  return {
    timer,
    remainingMs: getRemainingMs(timer, now),
    today,
    todayFocusCount,
    historySize: history.length,
    storageAvailable,
    description,
    setDescription,
    editDescription,
    start,
    pause,
    toggle,
    reset,
    skip,
    select,
    clearHistory,
  };
}
