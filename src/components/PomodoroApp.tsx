"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePomodoro } from "@/hooks/usePomodoro";
import { MAX_DESCRIPTION_LENGTH, type SessionRecord } from "@/lib/history";
import { SESSION_KINDS, SESSION_LABEL, formatDuration } from "@/lib/session";

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

const buttonBase =
  "rounded-lg px-4 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = `${buttonBase} bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 dark:text-zinc-950`;
const secondaryButton = `${buttonBase} border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`;
const textField =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-zinc-700";

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

/** The properties of {@link HistoryItem}. */
interface HistoryItemProps {
  /** The record to show. */
  record: SessionRecord;
  /** Saves a new description for the record. */
  onEditDescription: (id: string, text: string) => void;
}

/**
 * One record in today's list. A focus record shows its description and lets
 * the user edit it.
 */
function HistoryItem({ record, onEditDescription }: HistoryItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const editButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const times = `${timeFormat.format(record.startedAt)}–${timeFormat.format(record.endedAt)}`;

  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(record.description ?? "");
    setEditing(true);
  };

  const finishEdit = (save: boolean) => {
    if (save) {
      onEditDescription(record.id, draft);
    }
    returnFocus.current = true;
    setEditing(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finishEdit(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finishEdit(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex justify-between gap-4">
        <span>{SESSION_LABEL[record.kind]}</span>
        <span className="text-zinc-600 tabular-nums dark:text-zinc-400">{times}</span>
      </div>
      {record.kind === "focus" &&
        (editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              aria-label={`Description of the focus session ${times}`}
              value={draft}
              maxLength={MAX_DESCRIPTION_LENGTH}
              autoFocus
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              onKeyDown={onKeyDown}
              className={`${textField} min-w-0 flex-1 text-sm`}
            />
            <button type="button" onClick={() => finishEdit(true)} className={`${primaryButton} text-sm`}>
              Save
            </button>
            <button type="button" onClick={() => finishEdit(false)} className={`${secondaryButton} text-sm`}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span data-testid="record-description" className="break-words text-sm text-zinc-700 dark:text-zinc-300">
              {record.description}
            </span>
            <button
              ref={editButton}
              type="button"
              aria-label={`Edit description of the focus session ${times}`}
              onClick={startEdit}
              className={`${secondaryButton} shrink-0 px-3 py-1 text-sm`}
            >
              Edit description
            </button>
          </div>
        ))}
    </li>
  );
}

/** The Pomodoro timer with its controls and today's history. */
export function PomodoroApp() {
  const {
    timer,
    remainingMs,
    today,
    todayFocusCount,
    historySize,
    storageAvailable,
    description,
    setDescription,
    editDescription,
    start,
    pause,
    toggle,
    reset,
    skip,
    select,
    clearHistory,
  } = usePomodoro();
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

      {!storageAvailable && (
        <p
          role="status"
          className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
        >
          The browser storage is not available. The app cannot save your history after you close the page.
        </p>
      )}

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

        {timer.kind === "focus" && (
          <div className="flex w-full flex-col gap-1">
            <label htmlFor="focus-description" className="text-sm font-medium">
              What are you working on?
            </label>
            <input
              id="focus-description"
              type="text"
              value={description}
              maxLength={MAX_DESCRIPTION_LENGTH}
              onChange={(event) => setDescription(event.target.value)}
              className={textField}
            />
          </div>
        )}

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
              <HistoryItem key={record.id} record={record} onEditDescription={editDescription} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
