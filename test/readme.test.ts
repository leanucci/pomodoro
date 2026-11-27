import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FOCUS_SESSIONS_PER_LONG_BREAK, SESSION_DURATION_MS } from "@/lib/session";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/history";

const root = join(__dirname, "..");
const readme = readFileSync(join(root, "README.md"), "utf8");
const claude = readFileSync(join(root, "CLAUDE.md"), "utf8");

/** Returns the commands in the "Commands" section of `CLAUDE.md`. */
function claudeCommands(): string[] {
  const section = claude.split(/^## Commands$/m)[1]?.split(/^## /m)[0] ?? "";
  return [...section.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

describe("README", () => {
  it("states the live URL near the top", () => {
    const index = readme.indexOf("https://pomodoro.vercel.app");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(readme.slice(0, index).split("\n").length).toBeLessThanOrEqual(10);
  });

  it("contains each command from the Commands section of CLAUDE.md", () => {
    const commands = claudeCommands();
    expect(commands).toEqual(["npm ci", "npm test", "npm run lint", "npm run typecheck", "npm run build", "npm run dev"]);
    for (const command of commands) {
      expect(readme).toContain(command);
    }
  });

  it("describes the features that the app has today", () => {
    const minutes = (ms: number) => `${ms / 60_000}-minute`;
    expect(readme).toContain(`${minutes(SESSION_DURATION_MS.focus)} focus session`);
    expect(readme).toContain(`${minutes(SESSION_DURATION_MS.shortBreak)} short break`);
    expect(readme).toContain(`${minutes(SESSION_DURATION_MS.longBreak)} long break`);
    expect(FOCUS_SESSIONS_PER_LONG_BREAK).toBe(4);
    expect(readme).toContain("every fourth focus session");
    expect(readme).toContain(`${MAX_DESCRIPTION_LENGTH} characters`);
    expect(readme).toMatch(/Session history/);
  });

  it("keeps the links to specs/ and APPROACH.md", () => {
    expect(readme).toContain("[`specs/`](specs/)");
    expect(readme).toContain("(https://github.com/leanucci/portfolio/blob/main/APPROACH.md)");
  });
});
