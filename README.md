# Pump - Workout Tracker

A mobile-first workout tracking SPA built with React + TypeScript. All data is stored client-side in IndexedDB.

## Features

- Monthly calendar view with day indicators for logged workouts
- Multiple routines per day, each with named exercises
- Exercise fields: name, reps, weight, sets, time (mm:ss)
- Per-set completion tracking (tap to toggle)
- Photo capture and attachment per exercise (compressed, stored in IndexedDB)
- Inline routine renaming
- Microsoft SSO via Azure Static Web Apps built-in auth
- Auth bypassed automatically in development mode

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Dexie.js** (IndexedDB wrapper) + dexie-react-hooks
- **Plain CSS** (mobile-first, dark green theme)
- **Azure SWA** built-in authentication (AAD)

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Auth is skipped in dev mode.

## Production Build

```bash
npm run build
```

Output in `dist/`. Deploy to Azure Static Web Apps.

## Azure SWA Deployment

1. Create an Azure Static Web App resource
2. Set the `AAD_CLIENT_ID` application setting to your Azure AD app registration client ID
3. Configure build:
   - App location: `/`
   - Output location: `dist`
   - API location: (empty)

Auth config is in `staticwebapp.config.json`. All routes require authentication; unauthenticated users are redirected to Microsoft login.

## Data Model

All data stored in IndexedDB via Dexie.js (database: `PumpDB`):

| Table | Fields |
|-------|--------|
| `routines` | id, date (YYYY-MM-DD), name, order |
| `exercises` | id, routineId, name, repetitions, weight, sets, setsCompleted, time (mm:ss), order |
| `exercisePhotos` | id, exerciseId, blob, timestamp |

## Project Structure

```
pump/
├── index.html
├── package.json
├── staticwebapp.config.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── db.ts
    ├── types.ts
    ├── hooks/
    │   ├── useAuth.ts
    │   └── useAutoSave.ts
    ├── components/
    │   ├── MonthCalendar.tsx
    │   ├── DayView.tsx
    │   ├── RoutineCard.tsx
    │   ├── ExerciseRow.tsx
    │   ├── ExerciseForm.tsx
    │   └── PhotoManager.tsx
    └── styles/
        └── app.css
```
