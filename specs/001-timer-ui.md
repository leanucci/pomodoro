# 001: Timer UI and Local History

- **Release:** none

## Summary

Create the first version of the Pomodoro web app. A user runs focus sessions and breaks with a timer. The app keeps a history of completed sessions in the browser storage, so it works with no account.

This spec also creates the Next.js project. No application code exists before this spec.

## Requirements

### Project

1. Create a Next.js project that follows the "Next.js Rules" in `CLAUDE.md`.
2. `package.json` has the scripts `lint`, `typecheck`, `test`, and `build`.

### Timer

3. The app has three session types: focus (25 minutes), short break (5 minutes), and long break (15 minutes).
4. The app shows the remaining time as `MM:SS` in large text.
5. The app has these controls: start, pause, resume, reset, and skip.
   - Reset stops the timer and sets the remaining time to the full duration of the current session.
   - Skip ends the current session with no record and goes to the next session.
6. The user can select a session type manually. A manual selection stops the timer.
7. After a focus session ends, the next session is a short break. After every fourth completed focus session, the next session is a long break. After a break ends, the next session is a focus session.
8. The next session does not start automatically. The user starts it.
9. The timer stays correct when the browser tab is in the background. Calculate the remaining time from the end time, not by counting ticks.
10. The browser tab title shows the remaining time and the session type, for example `24:13 · Focus`.
11. When a session ends, the app plays a short sound.

### History

12. When a session ends with no skip, the app adds a record to the history. A record has: session type, start time, end time, and planned duration.
13. The app stores the history in `localStorage`. The history stays after a page reload.
14. The app shows:
    - The number of completed focus sessions today.
    - A list of today's completed sessions, newest first.
15. The user can clear the history. The app asks for confirmation first.
16. If the stored data is missing or not valid, the app starts with an empty history and does not crash.
17. The app keeps the 500 newest records at most. It deletes older records.

### Interface

18. The interface works on screen widths from 320 px to desktop.
19. The interface supports light mode and dark mode from the system setting.
20. All controls work with the keyboard and have accessible names. The space key starts and pauses the timer.

## Acceptance Criteria

1. Given a new visit, when the page loads, then it shows `25:00` and the focus session type.
2. Given a running focus session, when 25 minutes pass, then the app plays a sound, adds a focus record to the history, and selects a short break.
3. Given three completed focus sessions, when the fourth focus session ends, then the app selects a long break.
4. Given a running session, when the user pauses for 1 minute and then resumes, then the remaining time is the same as at the pause.
5. Given a running session, when the user selects skip, then the history does not change and the app selects the next session.
6. Given a running session, when the user selects reset, then the timer stops and shows the full duration of the session.
7. Given two completed focus sessions, when the user reloads the page, then the app shows 2 focus sessions today.
8. Given a completed session from yesterday, when the page loads, then today's count and list do not include it.
9. Given `localStorage` contains text that is not valid JSON, when the page loads, then the app shows an empty history.
10. Given a history, when the user clears it and confirms, then the history is empty after a reload.
11. Given focus on the page, when the user presses the space key, then the timer starts. When the user presses it again, the timer pauses.
12. Given a running session, when the tab is in the background for 10 minutes, then the remaining time is correct when the user returns.

Tests must use fake timers. Do not wait for real minutes.

## Out of Scope

- Accounts and sign-in (spec 002).
- Server storage of the history (spec 003).
- Custom durations and other settings.
- Browser notifications.
- Statistics for days before today.

## Notes

- Use the Web Audio API or a small bundled audio file for the sound. Browsers block sound until the user interacts with the page. The start button counts as an interaction.
