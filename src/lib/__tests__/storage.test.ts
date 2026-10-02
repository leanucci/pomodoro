import { describe, expect, it } from "vitest";
import { MAX_HISTORY_RECORDS } from "../history";
import { HISTORY_STORAGE_KEY, clearStoredHistory, loadHistory, saveHistory } from "../storage";

const valid = { kind: "focus", startedAt: 1, endedAt: 2, plannedMs: 1 };

describe("storage", () => {
  it("returns an empty history when no data exists", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("returns an empty history when the data is not valid JSON", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, "{not json");
    expect(loadHistory()).toEqual([]);
  });

  it("returns an empty history when the data is not an array", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ kind: "focus" }));
    expect(loadHistory()).toEqual([]);
  });

  it("ignores records that are not valid", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([valid, { kind: "nap" }, null]));
    expect(loadHistory()).toEqual([valid]);
  });

  it("keeps the 500 newest records on load", () => {
    const records = Array.from({ length: MAX_HISTORY_RECORDS + 10 }, (_, i) => ({
      kind: "focus",
      startedAt: i * 1000,
      endedAt: i * 1000 + 500,
      plannedMs: 500,
    }));
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
    const history = loadHistory();
    expect(history).toHaveLength(MAX_HISTORY_RECORDS);
    expect(history[0].endedAt).toBe(10_500);
    expect(history.at(-1)?.endedAt).toBe((MAX_HISTORY_RECORDS + 9) * 1000 + 500);
  });

  it("keeps the 500 newest records on load when the stored order is not sorted", () => {
    const records = Array.from({ length: MAX_HISTORY_RECORDS + 10 }, (_, i) => ({
      kind: "focus",
      startedAt: i * 1000,
      endedAt: i * 1000 + 500,
      plannedMs: 500,
    })).reverse();
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
    const history = loadHistory();
    expect(history).toHaveLength(MAX_HISTORY_RECORDS);
    expect(history[0].endedAt).toBe(10_500);
    expect(history.at(-1)?.endedAt).toBe((MAX_HISTORY_RECORDS + 9) * 1000 + 500);
  });

  it("saves and clears the history", () => {
    saveHistory([{ kind: "focus", startedAt: 1, endedAt: 2, plannedMs: 1 }]);
    expect(loadHistory()).toHaveLength(1);
    clearStoredHistory();
    expect(loadHistory()).toEqual([]);
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });
});
