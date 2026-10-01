import { describe, expect, it } from "vitest";
import { formatDuration, nextSessionKind } from "../session";

describe("formatDuration", () => {
  it("formats minutes and seconds as MM:SS", () => {
    expect(formatDuration(25 * 60 * 1000)).toBe("25:00");
    expect(formatDuration((24 * 60 + 13) * 1000)).toBe("24:13");
    expect(formatDuration(0)).toBe("00:00");
  });

  it("rounds up to the next full second", () => {
    expect(formatDuration(59_001)).toBe("01:00");
    expect(formatDuration(1)).toBe("00:01");
  });

  it("shows zero for negative values", () => {
    expect(formatDuration(-5000)).toBe("00:00");
  });
});

describe("nextSessionKind", () => {
  it("selects a short break after a focus session", () => {
    expect(nextSessionKind("focus", 1)).toBe("shortBreak");
    expect(nextSessionKind("focus", 3)).toBe("shortBreak");
  });

  it("selects a long break after every fourth focus session", () => {
    expect(nextSessionKind("focus", 4)).toBe("longBreak");
    expect(nextSessionKind("focus", 8)).toBe("longBreak");
  });

  it("selects a focus session after a break", () => {
    expect(nextSessionKind("shortBreak", 1)).toBe("focus");
    expect(nextSessionKind("longBreak", 4)).toBe("focus");
  });
});
