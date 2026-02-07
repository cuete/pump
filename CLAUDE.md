# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start Vite dev server (auth bypassed in dev mode)
- `npm run build` - Type-check + production build (`tsc -b && vite build`)
- `npm run preview` - Preview production build locally
- No test runner configured; verify changes with `npm run build`

## Architecture

Workout tracking SPA. React 18 + TypeScript + Vite. All data stored client-side in IndexedDB via Dexie.js. Deployed to Azure Static Web Apps with Microsoft SSO (`/.auth/login/aad`).

**Navigation** is state-driven in `App.tsx` (no router). Two views:
- **Calendar view** (`MonthCalendar.tsx`) - Full month grid, prev/next month navigation
- **Day view** (`DayView.tsx` -> `RoutineCard.tsx` -> `ExerciseRow.tsx`) - Accordion of routines with compact exercise rows; tapping a row opens `ExerciseForm.tsx` as a bottom-sheet modal

**Data layer**: `db.ts` defines a Dexie database (`PumpDB`) with three tables: `routines`, `exercises`, `exercisePhotos`. Components use `useLiveQuery` from dexie-react-hooks for reactive reads. Photos are stored as compressed JPEG blobs directly in IndexedDB.

**Auth**: `useAuth.ts` fetches `/.auth/me` in production; returns a stub dev user when `import.meta.env.DEV` is true.

## Key Patterns

- **Local dates only**: Always construct dates with `new Date(year, month, day)`. Never use `toISOString()` for date strings — it converts to UTC which shifts dates on WSL/Windows timezone boundaries. Use a `toLocalDateStr()` helper that formats via `getFullYear()`/`getMonth()`/`getDate()`.
- **Dexie schema migrations**: Adding a field requires a new `this.version(N)` block in `db.ts` with an `.upgrade()` that backfills the field. Current version is **3**.
- **Portals for modals**: `ExerciseForm` renders via `createPortal(el, document.body)` because `RoutineCard` has `overflow: hidden`.
- **Controlled accordion**: Only one routine expanded at a time. `DayView` owns `expandedId` state and passes `expanded`/`onToggle` props to `RoutineCard`.
- **Set completion**: `setsCompleted` is a running count (left-to-right fill), not per-set booleans. Tapping set N completes sets 1..N or uncompletes from N onward.

## CSS Conventions

All styles in `src/styles/app.css`. Dark green theme (`--bg: #0a1a0a`, `--accent: #4caf50`). Mobile-first:
- Layouts use `100dvh` for viewport height
- Grid columns: always `minmax(0, 1fr)` to prevent horizontal overflow
- Inputs in grids need `min-width: 0` and `width: 100%`
- Touch targets: minimum 44px

## TypeScript

Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`. No linter configured — the `tsc` step in `npm run build` is the primary check.

## Deployment

Azure Static Web Apps. Config in `staticwebapp.config.json`:
- All routes require `authenticated` role
- 401 redirects to `/.auth/login/aad`
- `AAD_CLIENT_ID` app setting must be configured in Azure

## Known Issues

- `WeekCalendar.tsx` is dead code (replaced by `MonthCalendar.tsx`), safe to delete
