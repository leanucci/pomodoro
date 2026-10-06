import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_HISTORY_RECORDS, type SessionRecord } from "../history";
import {
  HISTORY_STORAGE_KEY,
  clearStoredHistory,
  isStorageAvailable,
  loadHistory,
  saveHistory,
  subscribeHistory,
} from "../storage";

/** A record from before IDs existed. */
const old = { kind: "focus", startedAt: 1, endedAt: 2, plannedMs: 1 } as const;
const valid: SessionRecord = { id: "a", ...old };

describe("storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearStoredHistory();
  });

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

  it("keeps records with no description and ignores a description that is not text", () => {
    const described = { ...valid, id: "b", endedAt: 3, description: "Write the report" };
    const numbered = { ...valid, id: "c", endedAt: 4, description: 7 };
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([valid, numbered, described]));
    expect(loadHistory()).toEqual([valid, described, { ...valid, id: "c", endedAt: 4 }]);
  });

  it("keeps the 500 newest records on load", () => {
    const records = Array.from({ length: MAX_HISTORY_RECORDS + 10 }, (_, i) => ({
      id: `r${i}`,
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
      id: `r${i}`,
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

  it("gives an ID to each record from before IDs and saves the IDs", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([old, old]));
    const history = loadHistory();
    expect(history).toEqual([
      { ...old, id: expect.any(String) },
      { ...old, id: expect.any(String) },
    ]);
    expect(history[0].id).not.toBe(history[1].id);
    expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? "[]")).toEqual(history);
    expect(loadHistory()).toBe(history);
  });

  it("keeps the same IDs for the visit when the app cannot save them", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([old]));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    const history = loadHistory();
    expect(history[0].id).toEqual(expect.any(String));
    expect(loadHistory()).toBe(history);
  });

  it("gives a new ID to a record with a duplicate ID", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([valid, { ...valid, endedAt: 3 }]));
    const [first, second] = loadHistory();
    expect(first.id).toBe("a");
    expect(second.id).not.toBe("a");
  });

  it("saves and clears the history", () => {
    saveHistory([valid]);
    expect(loadHistory()).toHaveLength(1);
    clearStoredHistory();
    expect(loadHistory()).toEqual([]);
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it("tells that the storage is available", () => {
    const unsubscribe = subscribeHistory(() => {});
    expect(isStorageAvailable()).toBe(true);
    unsubscribe();
  });

  it("tells that the storage is not available and keeps the history in memory", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    const unsubscribe = subscribeHistory(() => {});
    expect(isStorageAvailable()).toBe(false);

    saveHistory([valid]);
    expect(isStorageAvailable()).toBe(false);
    expect(loadHistory()).toEqual([valid]);
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
    unsubscribe();
  });
});
