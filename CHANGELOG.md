# Changelog

All notable changes to this project are in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Pomodoro timer with focus (25 min), short break (5 min), and long break (15 min) sessions.
- Start, pause, resume, reset, and skip controls. The space key starts and pauses the timer.
- A long break after every fourth completed focus session. The cycle continues after a page reload.
- Remaining time and session type in the browser tab title.
- A short sound when a session ends.
- Session history in browser storage, with today's focus count and today's sessions.
- A control to clear the history, with confirmation.
- A notice when the browser storage is not available.
