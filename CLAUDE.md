# CLAUDE.md

## Project

- **Name:** pomodoro
- **Purpose:** A Pomodoro timer web app. Users run focus and break sessions and see their history.
- **Type:** web app
- **Stack:** Next.js, TypeScript, Tailwind CSS. Later: Auth.js (Google sign-in) and Postgres on Neon.
- **Deploy target:** Vercel

## Commands

- **Install:** `npm ci`
- **Test:** `npm test`
- **Lint:** `npm run lint`
- **Type check:** `npm run typecheck`
- **Build:** `npm run build`
- **Run locally:** `npm run dev`

## Version

- **Version file:** none. Web apps do not use version numbers.
- **Doc format:** TSDoc

## Specs

- Specs are in `specs/`. Name each spec `NNN-feature-name.md`. Use `specs/TEMPLATE.md`.
- Use the `/spec` skill. It pushes the spec on a `build/NNN-name` branch, and the push starts the build agent.
- Shared agent rules are in `prompts/common.md` in `leanucci/workflows`.

## Next.js Rules

### Stack

- Next.js with the App Router, TypeScript in strict mode, and React.
- Tailwind CSS for styles.
- Vitest and React Testing Library for tests.
- ESLint for lint.
- npm for packages. Commit `package-lock.json`.

### Scripts

`package.json` must have these scripts. CI runs each one:

- `lint`: ESLint with no warnings.
- `typecheck`: `tsc --noEmit`.
- `test`: Vitest in run mode (not watch mode).
- `build`: `next build`.

### Code

- Use TSDoc comments for exported functions, components, and types.
- Use server components by default. Add `"use client"` only when a component needs browser APIs or state.
- Put browser storage access in one module. Do not call `localStorage` directly from components.
- Keep secrets in environment variables. Never expose a secret to the client. Only `NEXT_PUBLIC_*` variables reach the browser.
- Document each environment variable in `.env.example`.

### Deploy

- Vercel deploys each merge to `main`. Each pull request gets a preview URL.
- Web apps do not use version numbers. Use `Release: none` in specs. Add changelog entries under `Unreleased`.
