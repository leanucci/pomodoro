"use client";

import { useEffect } from "react";
import { usePomodoro } from "@/hooks/usePomodoro";
import { SESSION_KINDS, SESSION_LABEL, formatDuration } from "@/lib/session";

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

const buttonBase =
  "rounded-lg px-4 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = `${buttonBase} bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 dark:text-zinc-950`;
const secondaryButton = `${buttonBase} border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`;

/**
 * Tells if a keyboard event comes from an element that uses the space key itself.
 *
 * @param target - The event target.
 * @returns `true` if the space key must not control the timer.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || target.closest("button, a, input, textarea, select, [role='button']") !== null;
}

/** The Pomodoro timer with its controls and today's history. */
export function PomodoroApp() {
  const { timer, remainingMs, today, todayFocusCount, historySize, start, pause, toggle, reset, skip, select, clearHistory } =
    usePomodoro();
  const time = formatDuration(remainingMs);
  const label = SESSION_LABEL[timer.kind];

  useEffect(() => {
    document.title = `${time} · ${label}`;
  }, [time, label]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") {
        return;
      }
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || isInteractiveTarget(event.target)) {
        return;
      }
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const onClear = () => {
    if (window.confirm("Clear all session history? You cannot undo this.")) {
      clearHistory();
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-8 sm:py-12">
      <h1 className="text-center text-2xl font-semibold">Pomodoro</h1>

      <section aria-label="Timer" className="flex flex-col items-center gap-6">
        <div role="group" aria-label="Session type" className="flex w-full flex-wrap justify-center gap-2">
          {SESSION_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={timer.kind === kind}
              onClick={() => select(kind)}
              className={`${buttonBase} text-sm ${
                timer.kind === kind
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {SESSION_LABEL[kind]}
            </button>
          ))}
        </div>

        <p data-testid="current-session" className="text-lg text-zinc-600 dark:text-zinc-400">
          {label}
        </p>
        <p
          role="timer"
          aria-label="Remaining time"
          className="font-mono text-7xl font-bold tabular-nums sm:text-8xl"
        >
          {time}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {timer.status === "running" ? (
            <button type="button" onClick={pause} className={primaryButton}>
              Pause
            </button>
          ) : (
            <button type="button" onClick={start} className={primaryButton}>
              {timer.status === "paused" ? "Resume" : "Start"}
            </button>
          )}
          <button type="button" onClick={reset} className={secondaryButton}>
            Reset
          </button>
          <button type="button" onClick={skip} className={secondaryButton}>
            Skip
          </button>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Press the space key to start or pause.</p>
      </section>

      <section aria-labelledby="history-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="history-heading" className="text-xl font-semibold">
            Today
          </h2>
          <button type="button" onClick={onClear} disabled={historySize === 0} className={`${secondaryButton} text-sm`}>
            Clear history
          </button>
        </div>
        <p data-testid="focus-count">
          {todayFocusCount === 1 ? "1 focus session today" : `${todayFocusCount} focus sessions today`}
        </p>
        {today.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">No completed sessions today.</p>
        ) : (
          <ul aria-label="Completed sessions today" className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {today.map((record) => (
              <li key={`${record.endedAt}-${record.kind}`} className="flex justify-between gap-4 py-2">
                <span>{SESSION_LABEL[record.kind]}</span>
                <span className="text-zinc-600 tabular-nums dark:text-zinc-400">
                  {timeFormat.format(record.startedAt)}–{timeFormat.format(record.endedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
