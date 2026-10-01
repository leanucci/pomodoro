import { describe, expect, it } from "vitest";
import { INITIAL_TIMER_STATE, getRemainingMs, timerReducer } from "../timer";

const MINUTE = 60 * 1000;

describe("timerReducer", () => {
  it("calculates the remaining time from the end time", () => {
    const running = timerReducer(INITIAL_TIMER_STATE, { type: "start", now: 0 });
    expect(running.endTime).toBe(25 * MINUTE);
    expect(getRemainingMs(running, 10 * MINUTE)).toBe(15 * MINUTE);
    expect(getRemainingMs(running, 30 * MINUTE)).toBe(0);
  });

  it("keeps the remaining time during a pause", () => {
    let state = timerReducer(INITIAL_TIMER_STATE, { type: "start", now: 0 });
    state = timerReducer(state, { type: "pause", now: 5 * MINUTE });
    expect(getRemainingMs(state, 6 * MINUTE)).toBe(20 * MINUTE);
    state = timerReducer(state, { type: "start", now: 6 * MINUTE });
    expect(state.startedAt).toBe(0);
    expect(getRemainingMs(state, 6 * MINUTE)).toBe(20 * MINUTE);
  });

  it("counts completed focus sessions and selects a long break after the fourth", () => {
    let state = INITIAL_TIMER_STATE;
    const kinds: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      state = timerReducer(state, { type: "complete" });
      kinds.push(state.kind);
    }
    expect(kinds).toEqual([
      "shortBreak",
      "focus",
      "shortBreak",
      "focus",
      "shortBreak",
      "focus",
      "longBreak",
      "focus",
    ]);
    expect(state.completedFocus).toBe(4);
  });

  it("does not count a skipped focus session", () => {
    const state = timerReducer(INITIAL_TIMER_STATE, { type: "skip" });
    expect(state.kind).toBe("shortBreak");
    expect(state.completedFocus).toBe(0);
  });

  it("stops the timer when the user selects a session type", () => {
    const running = timerReducer(INITIAL_TIMER_STATE, { type: "start", now: 0 });
    const state = timerReducer(running, { type: "select", kind: "longBreak" });
    expect(state.status).toBe("idle");
    expect(state.remainingMs).toBe(15 * MINUTE);
  });
});
