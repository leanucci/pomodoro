import { describe, expect, it } from "vitest";
import { MAX_HISTORY_RECORDS, addRecord, todaysRecords, type SessionRecord } from "../history";

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
