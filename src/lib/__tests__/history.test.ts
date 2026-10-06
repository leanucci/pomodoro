import { describe, expect, it } from "vitest";
import {
  MAX_HISTORY_RECORDS,
  addRecord,
  focusSessionsInCycle,
  createRecordId,
  normalizeDescription,
  sanitizeRecord,
  todaysRecords,
  updateDescription,
  type SessionRecord,
} from "../history";

function record(endedAt: number): SessionRecord {
  return { id: `id-${endedAt}`, kind: "focus", startedAt: endedAt - 1000, endedAt, plannedMs: 1000 };
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

describe("createRecordId", () => {
  it("makes a different ID each time", () => {
    const ids = new Set(Array.from({ length: 100 }, createRecordId));
    expect(ids.size).toBe(100);
  });

  it("makes different IDs when crypto.randomUUID is not available", () => {
    const randomUUID = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 100 }, createRecordId));
      expect(ids.size).toBe(100);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: randomUUID, configurable: true });
    }
  });
});

describe("updateDescription", () => {
  const first = record(1000);
  const second = { ...record(2000), description: "Draft" };

  it("changes the description of one record", () => {
    const result = updateDescription([first, second], second.id, "  Final draft ");
    expect(result).toEqual([first, { ...second, description: "Final draft" }]);
  });

  it("removes the description when the text is empty", () => {
    const [, result] = updateDescription([first, second], second.id, "  ");
    expect(result).not.toHaveProperty("description");
  });

  it("changes only one of two records with the same type, start time, and end time", () => {
    const twin = { ...first, id: "twin" };
    const result = updateDescription([first, twin], twin.id, "Twin");
    expect(result).toEqual([first, { ...twin, description: "Twin" }]);
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

  it("gives an ID to a record with no ID", () => {
    const stored = { kind: "focus", startedAt: 0, endedAt: 1000, plannedMs: 1000 } as const;
    const result = sanitizeRecord(stored);
    expect(result).toEqual({ ...stored, id: expect.any(String) });
    expect(result.id).not.toBe("");
  });

  it("gives a new ID to a record with an ID that is not text or that is already used", () => {
    expect(sanitizeRecord({ ...record(1000), id: 7 }).id).toEqual(expect.any(String));
    expect(sanitizeRecord(record(1000), new Set(["id-1000"])).id).not.toBe("id-1000");
  });
});
