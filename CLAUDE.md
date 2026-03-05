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
- **Calendar view** (`MonthCalendar.tsx`) - Full month grid with swipe navigation, settings gear icon opens `SettingsMenu.tsx`
- **Day view** (`DayView.tsx` → `RoutineCard.tsx` → `ExerciseRow.tsx`) - Accordion of routines with compact exercise rows; tapping a row opens `ExerciseForm.tsx` as a bottom-sheet modal

**Data layer**: `db.ts` defines a Dexie database (`PumpDB`) with three tables: `routines`, `exercises`, `exercisePhotos`. Components use `useLiveQuery` from dexie-react-hooks for reactive reads. Photos are stored as compressed JPEG blobs directly in IndexedDB. Current Dexie schema version is **4**.

**Auth**: `useAuth.ts` fetches `/.auth/me` in production; returns a stub dev user when `import.meta.env.DEV` is true.

## Component Tree

```
App.tsx
├── MonthCalendar.tsx          - Month grid, day selection, swipe nav
│   └── SettingsMenu.tsx       - Export/import/clear data (portal)
└── DayView.tsx                - Day header + routine list
    └── RoutineCard.tsx        - Expandable routine accordion
        ├── DraggableExerciseList.tsx  - Drag-to-reorder wrapper (@dnd-kit)
        │   └── ExerciseRow.tsx        - Compact exercise display (sortable)
        ├── ExerciseForm.tsx           - Edit exercise bottom-sheet (portal)
        │   └── PhotoManager.tsx       - Photo capture/gallery
        └── Copy routine dialog        - Inline portal for copying to another date
```

## Key Features

- **Drag-to-reorder exercises**: `DraggableExerciseList.tsx` uses `@dnd-kit/core` + `@dnd-kit/sortable`. Touch activation has 200ms delay and 8px tolerance to distinguish taps from drags.
- **Copy routine**: `RoutineCard` has a copy dialog that duplicates a routine (with exercises, setsCompleted reset to 0) to another date.
- **Routine renaming**: Inline rename by tapping the routine name in the header.
- **Set completion**: `setsCompleted` is a running count (left-to-right fill), not per-set booleans. Tapping set N completes sets 1..N or uncompletes from N onward.
- **Export/Import**: `SettingsMenu.tsx` + `utils/export.ts` — full database export to JSON (including photos as base64) and import with merge. Also supports clearing all data.
- **Exercise fields**: name, repetitions, weight, sets, setsCompleted, time (mm:ss), distance (miles).
- **Photos**: Per-exercise photo capture via `PhotoManager.tsx`, stored as compressed JPEG blobs in IndexedDB.

## Key Patterns

- **Local dates only**: Always construct dates with `new Date(year, month, day)`. Never use `toISOString()` for date strings — it converts to UTC which shifts dates on WSL/Windows timezone boundaries. Use the `toLocalDateStr()` helper that formats via `getFullYear()`/`getMonth()`/`getDate()`.
- **Dexie schema migrations**: Adding a field requires a new `this.version(N)` block in `db.ts` with an `.upgrade()` that backfills the field. Current version is **4** (v2: time field, v3: setsCompleted, v4: distance).
- **Portals for modals**: `ExerciseForm`, `SettingsMenu`, and the copy routine dialog all render via `createPortal(el, document.body)` because parent containers have `overflow: hidden`.
- **Controlled accordion**: Only one routine expanded at a time. `DayView` owns `expandedId` state and passes `expanded`/`onToggle` props to `RoutineCard`.
- **Drag-and-drop**: `@dnd-kit` with `PointerSensor` (8px distance constraint) and `TouchSensor` (200ms delay). Reorder updates `order` field for all exercises in a Dexie transaction.

## Dependencies

- **Runtime**: react, react-dom, dexie, dexie-react-hooks, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **Dev**: typescript, vite, @vitejs/plugin-react, @types/react, @types/react-dom

## CSS Conventions

All styles in `src/styles/app.css`. Dark green theme (`--bg: #0a1a0a`, `--accent: #4caf50`). Mobile-first:
- Layouts use `100dvh` for viewport height
- Grid columns: always `minmax(0, 1fr)` to prevent horizontal overflow
- Inputs in grids need `min-width: 0` and `width: 100%`
- Touch targets: minimum 44px
- Modals use `.modal-overlay` + `.modal-content` pattern with portal rendering

## TypeScript

Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`. No linter configured — the `tsc` step in `npm run build` is the primary check.

## Export Format

`ExportData` (version 1): JSON with nested structure `routines → exercises → photos`. Photos stored as base64 with mimeType. Import merges with existing data (appends routines with adjusted order). File naming: `pump-backup-YYYY-MM-DD.json`.

## Deployment

Azure Static Web Apps. Config in `staticwebapp.config.json`:
- All routes require `authenticated` role
- 401 redirects to `/.auth/login/aad`
- `AAD_CLIENT_ID` app setting must be configured in Azure
- CI/CD via GitHub Actions (`.github/workflows/`)
