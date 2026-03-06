# Pump - Workout Tracker

A mobile-first workout tracking SPA built with React + TypeScript, with a separate REST API backend using Azure Table Storage.

## Architecture

The project is split into two parts:

- **UI** (`/src`) - React frontend with Azure Static Web Apps authentication
- **API** (`/api`) - Azure Functions backend with Shared Key authentication and Azure Table Storage

### UI → API Communication

- UI authenticates users via Azure SWA (Microsoft SSO)
- UI calls API with Shared Key header (`x-api-key`)
- API stores data in Azure Table Storage (replaces client-side IndexedDB)
- userId from Azure SWA auth is used to partition data in Table Storage

## Features

- Monthly calendar view with day indicators for logged workouts
- Multiple routines per day, each with named exercises
- Exercise fields: name, reps, weight, sets, time (mm:ss), distance (miles)
- Per-set completion tracking (tap to toggle)
- Drag-and-drop exercise reordering within routines
- Saved exercises library with autocomplete picker
- Inline routine renaming
- Export/import data as JSON
- Settings menu: export, import, clear all data
- Microsoft SSO via Azure Static Web Apps built-in auth
- Auth bypassed automatically in development mode

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **@dnd-kit** (drag-and-drop: core, sortable, utilities)
- **Plain CSS** (mobile-first, dark green theme)
- **Azure SWA** built-in authentication (AAD)

### Backend
- **Azure Functions** (Node.js 18+)
- **Azure Table Storage**
- **Shared Key authentication**

## Getting Started

### Prerequisites

- Node.js 18+
- Azure Functions Core Tools: `npm install -g azure-functions-core-tools@4`
- Azure Storage Account or Azurite for local development

### Setup

1. **Install dependencies:**

```bash
# Frontend
npm install

# API
cd api
npm install
cd ..
```

2. **Configure environment variables:**

Create `.env` in project root:
```
VITE_API_URL=http://localhost:7071/api
VITE_API_KEY=your-shared-key-here
```

Create `api/local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "API_SHARED_KEY": "your-shared-key-here"
  }
}
```

**Note:** Use the same key in both `.env` and `api/local.settings.json`.

3. **Start Azurite (local Azure Storage emulator):**

```bash
npm install -g azurite
azurite --silent --location ./azurite --debug ./azurite/debug.log
```

4. **Create tables in Azurite:**

```bash
# Using Azure Storage Explorer or Azure CLI
az storage table create --name routines --connection-string "UseDevelopmentStorage=true"
az storage table create --name exercises --connection-string "UseDevelopmentStorage=true"
```

Or use Azure Storage Explorer (GUI) to create the tables.

### Development

Run both frontend and backend:

```bash
# Terminal 1 - Start API
cd api
npm start

# Terminal 2 - Start UI
npm run dev
```

- UI: `http://localhost:5173`
- API: `http://localhost:7071`

Auth is skipped in dev mode (hardcoded user).

## Production Build

```bash
# Build frontend
npm run build

# Build and deploy API
cd api
npm run build
func azure functionapp publish <function-app-name>
```

## Azure Deployment

### 1. Azure Resources

Create:
- Azure Static Web App (for UI)
- Azure Function App (Node.js 18, for API)
- Azure Storage Account (for Table Storage)

### 2. Configure Azure Static Web App

1. Set build configuration:
   - App location: `/`
   - Output location: `dist`
   - API location: (empty - API is separate)

2. Configure authentication in `staticwebapp.config.json`

3. Set application settings:
   - `VITE_API_URL`: `https://<function-app-name>.azurewebsites.net/api`
   - `VITE_API_KEY`: `<your-shared-key>`

### 3. Configure Azure Function App

Set application settings:
- `AZURE_STORAGE_CONNECTION_STRING`: Connection string from Storage Account
- `API_SHARED_KEY`: Same key as in Static Web App
- `FUNCTIONS_WORKER_RUNTIME`: `node`

Enable CORS to allow Static Web App origin.

### 4. Deploy

```bash
# Deploy UI
# (Automated via GitHub integration or:)
npm run build
# Upload dist/ to Azure Static Web App

# Deploy API
cd api
func azure functionapp publish <function-app-name>
```

## Data Model

All data stored in Azure Table Storage:

### routines
| Field | Type | Description |
|-------|------|-------------|
| PartitionKey | string | userId (from Azure SWA auth) |
| RowKey | string | routineId (auto-generated) |
| date | string | YYYY-MM-DD |
| name | string | Routine name |
| order | number | Display order |

### exercises
| Field | Type | Description |
|-------|------|-------------|
| PartitionKey | string | userId |
| RowKey | string | exerciseId (auto-generated) |
| routineId | string | Reference to routine |
| name | string | Exercise name |
| repetitions | number | Number of reps |
| weight | number | Weight in lbs |
| sets | number | Total sets |
| setsCompleted | number | Completed sets |
| time | string | Duration (mm:ss) |
| distance | number | Distance in miles |
| order | number | Display order |

## Project Structure

```
pump/
├── index.html
├── package.json
├── .env.example
├── staticwebapp.config.json
├── vite.config.ts
├── tsconfig.json
├── README.md
├── src/                    # Frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── db.ts              # API client wrapper
│   ├── api.ts             # HTTP API client
│   ├── types.ts
│   ├── vite-env.d.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useAutoSave.ts
│   ├── components/
│   │   ├── MonthCalendar.tsx
│   │   ├── DayView.tsx
│   │   ├── RoutineCard.tsx
│   │   ├── ExerciseRow.tsx
│   │   ├── ExerciseForm.tsx
│   │   ├── ExercisePicker.tsx
│   │   ├── DraggableExerciseList.tsx
│   │   └── SettingsMenu.tsx
│   ├── styles/
│   │   └── app.css
│   └── utils/
│       └── export.ts
└── api/                    # Backend
    ├── package.json
    ├── tsconfig.json
    ├── host.json
    ├── local.settings.json
    ├── README.md
    ├── auth.ts             # Shared key validation
    ├── storage.ts          # Table Storage operations
    ├── routines.ts         # Routines endpoints
    └── exercises.ts        # Exercises endpoints
```

## API Endpoints

See [api/README.md](api/README.md) for detailed API documentation.

## Migration

This version uses Azure Table Storage for server-side data persistence with:

- Azure Table Storage (server-side)
- RESTful API with Shared Key authentication
- Multi-user support via userId partitioning

The frontend no longer uses IndexedDB - all data is stored in Azure and accessed via the API.

## License

MIT
