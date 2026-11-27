# pomodoro

A Pomodoro timer web app. Agents build it from the specs in [`specs/`](specs/).

**Live app:** https://pomodoro.vercel.app

The process is in [APPROACH.md](https://github.com/leanucci/portfolio/blob/main/APPROACH.md).

## Features

- **Focus and break sessions.** Work in a 25-minute focus session. Then rest in a
  5-minute short break. After every fourth focus session, take a 15-minute long break.
- **Timer controls.** Start, pause, resume, reset, or skip a session. Press the space key
  to start or pause the timer. You can also select a session type yourself.
- **Signals.** The browser tab title shows the remaining time and the session type.
  A short sound plays when a session ends.
- **Descriptions.** Write what you work on during a focus session, in 100 characters or
  fewer. Edit the description later in today's list.
- **Session history.** See how many focus sessions you completed today, and a list of
  today's sessions. Clear the history if you want to start again.

The app keeps the history in your browser storage. It does not send your data to a server.

## Run Locally

You need Node.js and npm.

1. Install the dependencies:

   ```sh
   npm ci
   ```

2. Start the development server, then open http://localhost:3000:

   ```sh
   npm run dev
   ```

## Check and Build

- Run the tests:

  ```sh
  npm test
  ```

- Run the linter:

  ```sh
  npm run lint
  ```

- Run the type check:

  ```sh
  npm run typecheck
  ```

- Build the app for production:

  ```sh
  npm run build
  ```
