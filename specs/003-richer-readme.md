# 003: Richer README

- **Release:** none
- **Human approval:** not required

## Summary

Expand the README beyond its current one-paragraph summary. Give a new visitor a clear
picture of what the app does, where to try it, and how to run it locally.

## Requirements

1. The README states the project's live URL.
2. The README describes the app's main features in plain language: focus and break sessions,
   and viewing session history.
3. The README gives the commands to install dependencies, run the app locally, run tests, and
   build it for production.
4. The README keeps the existing links to `specs/` and `APPROACH.md`.

## Acceptance Criteria

1. Given the README, when a new visitor reads it, then they find the live URL near the top.
2. Given the README, when a visitor wants to run the app locally, then every command in
   `CLAUDE.md`'s Commands section appears in the README.
3. Given the README, when a visitor wants to understand the app, then the features list
   matches what the app actually does today. Check `specs/001-timer-ui.md` and
   `specs/002-pomodoro-descriptions.md`.

## Out of Scope

- Screenshots or GIFs.
- A changelog section. `CHANGELOG.md` already covers that.

## Notes

The confirmed live URL is https://pomodoro.vercel.app (returns the app, title "Pomodoro
timer"). Use it directly; do not guess a different Vercel URL.
