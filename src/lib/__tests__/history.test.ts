import { describe, expect, it } from "vitest";
import {
  MAX_HISTORY_RECORDS,
  addRecord,
  focusSessionsInCycle,
  normalizeDescription,
  recordKey,
  sanitizeRecord,
  todaysRecords,
  updateDescription,
  type SessionRecord,
} from "../history";

function record(endedAt: number): SessionRecord {
  return { kind: "focus", startedAt: endedAt - 1000, endedAt, plannedMs: 1000 };
}

describe("addRecord", () => {
  it("keeps the 500 newest records at most", () => {
    let history: SessionRecord[] = [];
    for (let i = 1; i <= MAX_HISTORY_RECORDS + 10; i += 1) {
      history = addRecord(history, record(i * 1000));
    }
    expect(history).toHaveLength(MAX_HISTORY_RECORDS);
    expect(history[0].endedAt).toBe(11_000);
    expect(history.at(-1)?.endedAt).toBe((MAX_HISTORY_RECORDS + 10) * 1000);
  });
});

describe("todaysRecords", () => {
  it("returns only records from today, newest first", () => {
    const now = new Date(2026, 9, 1, 15, 0).getTime();
    const yesterday = new Date(2026, 8, 30, 23, 0).getTime();
    const morning = new Date(2026, 9, 1, 9, 0).getTime();
    const noon = new Date(2026, 9, 1, 12, 0).getTime();
    const result = todaysRecords([record(yesterday), record(morning), record(noon)], now);
    expect(result.map((r) => r.endedAt)).toEqual([noon, morning]);
  });
});

describe("focusSessionsInCycle", () => {
  const now = new Date(2026, 9, 1, 15, 0).getTime();
  const at = (hour: number) => new Date(2026, 9, 1, hour, 0).getTime();
  const of = (kind: SessionRecord["kind"], endedAt: number): SessionRecord => ({ ...record(endedAt), kind });

  it("counts the focus records of today", () => {
    const history = [of("focus", at(9)), of("shortBreak", at(10)), of("focus", at(11)), of("focus", at(12))];
    expect(focusSessionsInCycle(history, now)).toBe(3);
  });

  it("starts the count after the newest long break of today", () => {
    const history = [of("focus", at(9)), of("longBreak", at(10)), of("focus", at(11))];
    expect(focusSessionsInCycle(history, now)).toBe(1);
  });

  it("does not count records from yesterday", () => {
    const yesterday = new Date(2026, 8, 30, 23, 0).getTime();
    expect(focusSessionsInCycle([of("focus", yesterday), of("focus", at(9))], now)).toBe(1);
  });
});

describe("normalizeDescription", () => {
  it("removes spaces at the start and at the end", () => {
    expect(normalizeDescription("  Read  ")).toBe("Read");
  });

  it("returns undefined for an empty text", () => {
    expect(normalizeDescription("")).toBeUndefined();
    expect(normalizeDescription("   ")).toBeUndefined();
  });

  it("keeps at most 100 characters", () => {
    expect(normalizeDescription("a".repeat(120))).toBe("a".repeat(100));
  });
});

describe("updateDescription", () => {
  const first = record(1000);
  const second = { ...record(2000), description: "Draft" };

  it("changes the description of one record", () => {
    const result = updateDescription([first, second], recordKey(second), "  Final draft ");
    expect(result).toEqual([first, { ...second, description: "Final draft" }]);
  });

  it("removes the description when the text is empty", () => {
    const [, result] = updateDescription([first, second], recordKey(second), "  ");
    expect(result).not.toHaveProperty("description");
  });
});

describe("sanitizeRecord", () => {
  it("keeps a record with no description", () => {
    expect(sanitizeRecord(record(1000))).toEqual(record(1000));
  });

  it("ignores a description that is not text and keeps the record", () => {
    const stored = { ...record(1000), description: 42 } as unknown as SessionRecord;
    expect(sanitizeRecord(stored)).toEqual(record(1000));
  });

  it("keeps a text description", () => {
    expect(sanitizeRecord({ ...record(1000), description: "Write" })).toEqual({ ...record(1000), description: "Write" });
  });
});
