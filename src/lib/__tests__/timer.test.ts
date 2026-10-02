import { describe, expect, it } from "vitest";
import { INITIAL_TIMER_STATE, getRemainingMs, idleState, timerReducer } from "../timer";

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

  it("selects a long break after the fourth completed focus session", () => {
    const focus = idleState("focus");
    expect(timerReducer(focus, { type: "complete", completedFocus: 1 }).kind).toBe("shortBreak");
    expect(timerReducer(focus, { type: "complete", completedFocus: 3 }).kind).toBe("shortBreak");
    expect(timerReducer(focus, { type: "complete", completedFocus: 4 }).kind).toBe("longBreak");
    expect(timerReducer(focus, { type: "complete", completedFocus: 8 }).kind).toBe("longBreak");
    expect(timerReducer(idleState("shortBreak"), { type: "complete", completedFocus: 3 }).kind).toBe("focus");
    expect(timerReducer(idleState("longBreak"), { type: "complete", completedFocus: 4 }).kind).toBe("focus");
  });

  it("selects a short break on skip from focus and focus on skip from a break", () => {
    const running = timerReducer(INITIAL_TIMER_STATE, { type: "start", now: 0 });
    const state = timerReducer(running, { type: "skip" });
    expect(state.kind).toBe("shortBreak");
    expect(state.status).toBe("idle");
    expect(timerReducer(idleState("shortBreak"), { type: "skip" }).kind).toBe("focus");
    expect(timerReducer(idleState("longBreak"), { type: "skip" }).kind).toBe("focus");
  });

  it("stops the timer when the user selects a session type", () => {
    const running = timerReducer(INITIAL_TIMER_STATE, { type: "start", now: 0 });
    const state = timerReducer(running, { type: "select", kind: "longBreak" });
    expect(state.status).toBe("idle");
    expect(state.remainingMs).toBe(15 * MINUTE);
  });
});
