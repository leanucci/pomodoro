import { describe, expect, it } from "vitest";
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

  it("saves and clears the history", () => {
    saveHistory([{ kind: "focus", startedAt: 1, endedAt: 2, plannedMs: 1 }]);
    expect(loadHistory()).toHaveLength(1);
    clearStoredHistory();
    expect(loadHistory()).toEqual([]);
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });
});
