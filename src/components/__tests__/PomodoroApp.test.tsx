import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HISTORY_STORAGE_KEY, clearStoredHistory } from "@/lib/storage";
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
        id: expect.any(String),
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

  it("continues the long-break cycle after a reload", () => {
    const at = (minutes: number) => NOW.getTime() - minutes * MINUTE;
    const records = [
      { kind: "focus", startedAt: at(120), endedAt: at(95), plannedMs: 25 * MINUTE },
      { kind: "shortBreak", startedAt: at(95), endedAt: at(90), plannedMs: 5 * MINUTE },
      { kind: "focus", startedAt: at(90), endedAt: at(65), plannedMs: 25 * MINUTE },
      { kind: "shortBreak", startedAt: at(65), endedAt: at(60), plannedMs: 5 * MINUTE },
      { kind: "focus", startedAt: at(60), endedAt: at(35), plannedMs: 25 * MINUTE },
      { kind: "shortBreak", startedAt: at(35), endedAt: at(30), plannedMs: 5 * MINUTE },
    ];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
    render(<PomodoroApp />);
    expect(currentSession()).toBe("Focus");
    completeSession(25 * MINUTE);
    expect(currentSession()).toBe("Long break");
  });

  it("starts a new cycle after a long break in the stored history", () => {
    const at = (minutes: number) => NOW.getTime() - minutes * MINUTE;
    const records = [
      { kind: "focus", startedAt: at(120), endedAt: at(95), plannedMs: 25 * MINUTE },
      { kind: "focus", startedAt: at(95), endedAt: at(70), plannedMs: 25 * MINUTE },
      { kind: "focus", startedAt: at(70), endedAt: at(45), plannedMs: 25 * MINUTE },
      { kind: "longBreak", startedAt: at(45), endedAt: at(30), plannedMs: 15 * MINUTE },
    ];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
    render(<PomodoroApp />);
    completeSession(25 * MINUTE);
    expect(currentSession()).toBe("Short break");
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

  it("does not count a skipped focus session for the long break", () => {
    render(<PomodoroApp />);
    for (let i = 0; i < 3; i += 1) {
      completeSession(25 * MINUTE);
      completeSession(5 * MINUTE);
    }
    click("Start");
    advance(MINUTE);
    click("Skip");
    expect(currentSession()).toBe("Short break");
    expect(storedHistory()).toHaveLength(6);
    click("Skip");
    expect(currentSession()).toBe("Focus");
    completeSession(25 * MINUTE);
    expect(currentSession()).toBe("Long break");
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

  it("does not show a storage notice when the storage is available", () => {
    render(<PomodoroApp />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a notice when the storage is not available and keeps today's sessions in memory", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    render(<PomodoroApp />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "The browser storage is not available. The app cannot save your history after you close the page.",
    );

    completeSession(25 * MINUTE);
    expect(currentSession()).toBe("Short break");
    expect(focusCount()).toBe("1 focus session today");
    clearStoredHistory();
  });

  describe("descriptions", () => {
    const LABEL = "What are you working on?";

    function descriptionField() {
      return screen.getByLabelText(LABEL) as HTMLInputElement;
    }

    function typeDescription(text: string) {
      fireEvent.change(descriptionField(), { target: { value: text } });
    }

    function editButton() {
      return screen.getByRole("button", { name: /^Edit description of the focus session/ });
    }

    function editField() {
      return screen.getByRole("textbox", { name: /^Description of the focus session/ }) as HTMLInputElement;
    }

    function storeFocusRecord(extra: Record<string, unknown>) {
      const record = { kind: "focus", startedAt: NOW.getTime() - 30 * MINUTE, endedAt: NOW.getTime() - 5 * MINUTE };
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([{ ...record, plannedMs: 25 * MINUTE, ...extra }]));
    }

    it("shows an empty description field on a new visit", () => {
      render(<PomodoroApp />);
      expect(descriptionField()).toBeInTheDocument();
      expect(descriptionField().value).toBe("");
    });

    it("keeps the field available while the focus session runs and is paused", () => {
      render(<PomodoroApp />);
      click("Start");
      expect(descriptionField()).toBeInTheDocument();
      click("Pause");
      expect(descriptionField()).toBeInTheDocument();
    });

    it("shows the description in today's list when the focus session ends", () => {
      render(<PomodoroApp />);
      click("Start");
      typeDescription("Write the report");
      advance(25 * MINUTE + 1000);
      const item = screen.getAllByRole("listitem")[0];
      expect(item).toHaveTextContent("Focus");
      expect(item).toHaveTextContent("Write the report");
    });

    it("stores the description with no spaces at the start and at the end", () => {
      render(<PomodoroApp />);
      typeDescription("  Read  ");
      completeSession(25 * MINUTE);
      expect(storedHistory()).toEqual([expect.objectContaining({ kind: "focus", description: "Read" })]);
    });

    it("stores no description when the field is empty", () => {
      render(<PomodoroApp />);
      completeSession(25 * MINUTE);
      expect(storedHistory()[0]).not.toHaveProperty("description");
    });

    it("shows an empty field for the next focus session", () => {
      render(<PomodoroApp />);
      typeDescription("Write the report");
      completeSession(25 * MINUTE);
      click("Focus");
      expect(descriptionField().value).toBe("");
    });

    it("does not show the field during a short break or a long break", () => {
      render(<PomodoroApp />);
      click("Short break");
      expect(screen.queryByLabelText(LABEL)).not.toBeInTheDocument();
      click("Long break");
      expect(screen.queryByLabelText(LABEL)).not.toBeInTheDocument();
    });

    it("does not change the history and clears the field on skip", () => {
      render(<PomodoroApp />);
      click("Start");
      typeDescription("Write the report");
      advance(MINUTE);
      click("Skip");
      expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
      click("Focus");
      expect(descriptionField().value).toBe("");
    });

    it("keeps the description on reset", () => {
      render(<PomodoroApp />);
      click("Start");
      typeDescription("Write the report");
      advance(MINUTE);
      click("Reset");
      expect(descriptionField().value).toBe("Write the report");
    });

    it("keeps only the first 100 characters of pasted text", () => {
      render(<PomodoroApp />);
      expect(descriptionField()).toHaveAttribute("maxLength", "100");
      typeDescription("a".repeat(120));
      expect(descriptionField().value).toBe("a".repeat(100));
    });

    it("saves an edit with the Enter key and keeps it after a reload", () => {
      storeFocusRecord({ description: "Draft" });
      const { unmount } = render(<PomodoroApp />);
      expect(screen.getByTestId("record-description")).toHaveTextContent("Draft");
      fireEvent.click(editButton());
      expect(editField()).toHaveFocus();
      fireEvent.change(editField(), { target: { value: "Final draft" } });
      fireEvent.keyDown(editField(), { key: "Enter" });
      expect(screen.getByTestId("record-description")).toHaveTextContent("Final draft");
      expect(editButton()).toHaveFocus();
      unmount();

      render(<PomodoroApp />);
      expect(screen.getByTestId("record-description")).toHaveTextContent("Final draft");
    });

    it("removes the description when the edit is empty", () => {
      storeFocusRecord({ description: "Draft" });
      render(<PomodoroApp />);
      fireEvent.click(editButton());
      fireEvent.change(editField(), { target: { value: "   " } });
      click("Save");
      expect(storedHistory()[0]).not.toHaveProperty("description");
      expect(screen.getByTestId("record-description")).toBeEmptyDOMElement();
    });

    it("applies the same rules to an edit", () => {
      storeFocusRecord({});
      render(<PomodoroApp />);
      fireEvent.click(editButton());
      expect(editField()).toHaveAttribute("maxLength", "100");
      fireEvent.change(editField(), { target: { value: ` ${"b".repeat(120)}` } });
      fireEvent.keyDown(editField(), { key: "Enter" });
      expect(storedHistory()[0]).toHaveProperty("description", "b".repeat(99));
    });

    it("does not change the description when the user presses Escape", () => {
      storeFocusRecord({ description: "Draft" });
      render(<PomodoroApp />);
      fireEvent.click(editButton());
      fireEvent.change(editField(), { target: { value: "Something else" } });
      fireEvent.keyDown(editField(), { key: "Escape" });
      expect(screen.queryByRole("textbox", { name: /^Description of the focus session/ })).not.toBeInTheDocument();
      expect(screen.getByTestId("record-description")).toHaveTextContent("Draft");
      expect(storedHistory()[0]).toHaveProperty("description", "Draft");
    });

    it("types a space and does not control the timer when the focus is in a description field", () => {
      storeFocusRecord({});
      render(<PomodoroApp />);
      click("Start");
      advance(MINUTE);
      expect(remaining()).toBe("24:00");

      descriptionField().focus();
      fireEvent.keyDown(descriptionField(), { key: " ", code: "Space" });
      typeDescription(" ");
      expect(descriptionField().value).toBe(" ");
      expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
      advance(MINUTE);
      expect(remaining()).toBe("23:00");

      fireEvent.click(editButton());
      fireEvent.keyDown(editField(), { key: " ", code: "Space" });
      expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
      advance(MINUTE);
      expect(remaining()).toBe("22:00");
    });

    it("keeps an edit in memory and shows the notice when the storage is not available", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Blocked", "SecurityError");
      });
      render(<PomodoroApp />);
      typeDescription("Draft");
      completeSession(25 * MINUTE);
      expect(screen.getByTestId("record-description")).toHaveTextContent("Draft");

      fireEvent.click(editButton());
      fireEvent.change(editField(), { target: { value: "Final draft" } });
      fireEvent.keyDown(editField(), { key: "Enter" });
      expect(screen.getByTestId("record-description")).toHaveTextContent("Final draft");
      expect(screen.getByRole("status")).toHaveTextContent("The browser storage is not available.");
      clearStoredHistory();
    });

    it("keeps an edit in memory and shows the notice when the storage cannot save the edit", () => {
      storeFocusRecord({ description: "Draft" });
      render(<PomodoroApp />);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Full", "QuotaExceededError");
      });
      fireEvent.click(editButton());
      fireEvent.change(editField(), { target: { value: "Final draft" } });
      fireEvent.keyDown(editField(), { key: "Enter" });
      expect(screen.getByTestId("record-description")).toHaveTextContent("Final draft");
      expect(screen.getByRole("status")).toHaveTextContent("The browser storage is not available.");
      clearStoredHistory();
    });

    it("changes only one of two records with the same type, start time, and end time", () => {
      const record = {
        kind: "focus",
        startedAt: NOW.getTime() - 30 * MINUTE,
        endedAt: NOW.getTime() - 5 * MINUTE,
        plannedMs: 25 * MINUTE,
      };
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([record, record]));
      render(<PomodoroApp />);
      const [first] = screen.getAllByRole("button", { name: /^Edit description of the focus session/ });
      fireEvent.click(first);
      fireEvent.change(editField(), { target: { value: "Only one" } });
      fireEvent.keyDown(editField(), { key: "Enter" });

      const descriptions = screen.getAllByTestId("record-description").map((element) => element.textContent);
      expect(descriptions.filter((text) => text === "Only one")).toHaveLength(1);
      expect(storedHistory().filter((item) => (item as { description?: string }).description === "Only one")).toHaveLength(1);
    });

    it("gives IDs to records from spec 001 and keeps the IDs after a reload", () => {
      storeFocusRecord({});
      const { unmount } = render(<PomodoroApp />);
      const [stored] = storedHistory() as { id?: unknown }[];
      expect(stored.id).toEqual(expect.any(String));
      unmount();

      render(<PomodoroApp />);
      expect(storedHistory()).toEqual([expect.objectContaining({ id: stored.id })]);
    });

    it("shows records from spec 001 with no description and no error", () => {
      storeFocusRecord({});
      render(<PomodoroApp />);
      expect(focusCount()).toBe("1 focus session today");
      expect(screen.getByTestId("record-description")).toBeEmptyDOMElement();
    });

    it("shows a record with no description when the stored description is a number", () => {
      storeFocusRecord({ description: 42 });
      render(<PomodoroApp />);
      expect(focusCount()).toBe("1 focus session today");
      expect(screen.getByTestId("record-description")).toBeEmptyDOMElement();
    });
  });
});
