import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HISTORY_STORAGE_KEY } from "@/lib/storage";
import { PomodoroApp } from "../PomodoroApp";

vi.mock("@/lib/sound", () => ({
  playChime: vi.fn(),
  unlockAudio: vi.fn(),
}));

const { playChime } = await import("@/lib/sound");

const MINUTE = 60 * 1000;
const NOW = new Date(2026, 9, 1, 10, 0, 0);

function remaining() {
  return screen.getByRole("timer").textContent;
}

function currentSession() {
  return screen.getByTestId("current-session").textContent;
}

function focusCount() {
  return screen.getByTestId("focus-count").textContent;
}

function storedHistory(): unknown[] {
  return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? "[]");
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

/** Runs a session from start to end. */
function completeSession(ms: number) {
  click("Start");
  advance(ms + 1000);
}

describe("PomodoroApp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(playChime).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows 25:00 and the focus session on a new visit", () => {
    render(<PomodoroApp />);
    expect(remaining()).toBe("25:00");
    expect(currentSession()).toBe("Focus");
    expect(screen.getByRole("button", { name: "Focus" })).toHaveAttribute("aria-pressed", "true");
    expect(document.title).toBe("25:00 · Focus");
  });

  it("plays a sound, records the session, and selects a short break when a focus session ends", () => {
    render(<PomodoroApp />);
    click("Start");
    advance(13 * MINUTE + 47 * 1000);
    expect(document.title).toBe("11:13 · Focus");
    advance(12 * MINUTE);

    expect(playChime).toHaveBeenCalledTimes(1);
    expect(storedHistory()).toEqual([
      {
        kind: "focus",
        startedAt: NOW.getTime(),
        endedAt: NOW.getTime() + 25 * MINUTE,
        plannedMs: 25 * MINUTE,
      },
    ]);
    expect(currentSession()).toBe("Short break");
    expect(remaining()).toBe("05:00");
    expect(focusCount()).toBe("1 focus session today");
  });

  it("does not start the next session automatically", () => {
    render(<PomodoroApp />);
    completeSession(25 * MINUTE);
    advance(MINUTE);
    expect(remaining()).toBe("05:00");
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("selects a long break after the fourth completed focus session", () => {
    render(<PomodoroApp />);
    for (let i = 0; i < 3; i += 1) {
      completeSession(25 * MINUTE);
      expect(currentSession()).toBe("Short break");
      completeSession(5 * MINUTE);
      expect(currentSession()).toBe("Focus");
    }
    completeSession(25 * MINUTE);
    expect(currentSession()).toBe("Long break");
    expect(remaining()).toBe("15:00");
    completeSession(15 * MINUTE);
    expect(currentSession()).toBe("Focus");
  });

  it("keeps the remaining time during a pause", () => {
    render(<PomodoroApp />);
    click("Start");
    advance(2 * MINUTE);
    click("Pause");
    expect(remaining()).toBe("23:00");
    advance(MINUTE);
    expect(remaining()).toBe("23:00");
    click("Resume");
    expect(remaining()).toBe("23:00");
    advance(MINUTE);
    expect(remaining()).toBe("22:00");
  });

  it("does not change the history on skip and selects the next session", () => {
    render(<PomodoroApp />);
    click("Start");
    advance(MINUTE);
    click("Skip");
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
    expect(currentSession()).toBe("Short break");
    expect(remaining()).toBe("05:00");
    advance(30 * MINUTE);
    expect(playChime).not.toHaveBeenCalled();
    click("Skip");
    expect(currentSession()).toBe("Focus");
  });

  it("stops the timer and shows the full duration on reset", () => {
    render(<PomodoroApp />);
    click("Start");
    advance(3 * MINUTE);
    click("Reset");
    expect(remaining()).toBe("25:00");
    advance(MINUTE);
    expect(remaining()).toBe("25:00");
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("stops the timer when the user selects a session type", () => {
    render(<PomodoroApp />);
    click("Start");
    advance(MINUTE);
    click("Long break");
    expect(currentSession()).toBe("Long break");
    expect(remaining()).toBe("15:00");
    advance(MINUTE);
    expect(remaining()).toBe("15:00");
  });

  it("shows the focus sessions of today after a reload", () => {
    const { unmount } = render(<PomodoroApp />);
    completeSession(25 * MINUTE);
    completeSession(5 * MINUTE);
    completeSession(25 * MINUTE);
    unmount();

    render(<PomodoroApp />);
    expect(focusCount()).toBe("2 focus sessions today");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Focus");
    expect(items[1]).toHaveTextContent("Short break");
  });

  it("does not include sessions from yesterday", () => {
    const yesterday = new Date(2026, 8, 30, 15, 0).getTime();
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([{ kind: "focus", startedAt: yesterday - 25 * MINUTE, endedAt: yesterday, plannedMs: 25 * MINUTE }]),
    );
    render(<PomodoroApp />);
    expect(focusCount()).toBe("0 focus sessions today");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("shows an empty history when the stored data is not valid JSON", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, "this is not JSON");
    render(<PomodoroApp />);
    expect(focusCount()).toBe("0 focus sessions today");
    expect(screen.getByText("No completed sessions today.")).toBeInTheDocument();
  });

  it("clears the history after confirmation", () => {
    const { unmount } = render(<PomodoroApp />);
    completeSession(25 * MINUTE);
    expect(focusCount()).toBe("1 focus session today");

    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    click("Clear history");
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(focusCount()).toBe("1 focus session today");

    confirm.mockReturnValueOnce(true);
    click("Clear history");
    expect(focusCount()).toBe("0 focus sessions today");
    unmount();

    render(<PomodoroApp />);
    expect(focusCount()).toBe("0 focus sessions today");
  });

  it("starts and pauses the timer with the space key", () => {
    render(<PomodoroApp />);
    fireEvent.keyDown(document.body, { key: " ", code: "Space" });
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    advance(MINUTE);
    fireEvent.keyDown(document.body, { key: " ", code: "Space" });
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(remaining()).toBe("24:00");
    advance(MINUTE);
    expect(remaining()).toBe("24:00");
  });

  it("shows the correct time after 10 minutes in a background tab", () => {
    render(<PomodoroApp />);
    click("Start");
    // A background tab does not run the interval. Only the clock moves.
    vi.setSystemTime(NOW.getTime() + 10 * MINUTE);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(remaining()).toBe("15:00");
  });
});
