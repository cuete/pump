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

## Testing

### Unit Tests

Run frontend and API unit tests:

```bash
# Frontend tests
npm test

# API tests
cd api
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage
```

### GitHub Actions CI

Tests run automatically on:
- Every push to `main` or `feature/**` branches
- Every pull request to `main`

See test results in the **Actions** tab of the GitHub repository.

### Test Coverage

Current test coverage:
- **Frontend**: API client, custom hooks (useRoutines, useExercises)
- **API**: Storage operations (routines, exercises, CRUD)
- **Total**: 18 unit tests, 3 integration tests (skipped in CI)

Integration tests require Azurite (Azure Storage Emulator). See `api/test/README.md` for setup instructions.

## Azure Deployment

This project uses **Azure Static Web Apps** which handles both frontend (UI) and backend (API) deployment automatically via GitHub Actions.

### 1. Create Azure Resources

**Required:**
- **Azure Static Web App** (Standard tier recommended for production)
- **Azure Storage Account** (for Table Storage)

**Not needed:** Separate Azure Function App (API is deployed as part of Static Web App)

### 2. Configure Azure Storage

1. Create Storage Account (General-purpose v2)
2. Create two tables:
   - `routines`
   - `exercises`
3. Copy the **Connection String** from Storage Account → Access keys

### 3. Configure Azure Static Web App

**Application Settings** (Azure Portal → Static Web App → Configuration):

| Name | Value | Description |
|------|-------|-------------|
| `AZURE_STORAGE_CONNECTION_STRING` | `DefaultEndpointsProtocol=https;AccountName=...` | From Storage Account |
| `API_SHARED_KEY` | `your-secret-key` | Generate a secure random string |

**Important:** Do NOT configure `VITE_*` variables in Azure Portal - these are configured in GitHub Actions.

### 4. Configure GitHub Repository

**GitHub Secrets** (Repo → Settings → Secrets and variables → Actions):

| Name | Value | Description |
|------|-------|-------------|
| `API_SHARED_KEY` | `your-secret-key` | **Must match** the value in Azure Portal |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_*` | Auto-generated | Created automatically by Azure |

**How to add secret:**
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `API_SHARED_KEY`
4. Value: Same value as configured in Azure Portal
5. Click "Add secret"

### 5. Deploy

Deployment is **automatic** via GitHub Actions:

1. **Push to `main` branch** → Triggers production deployment
2. **Open Pull Request** → Creates staging environment (preview)
3. **Merge PR** → Deploys to production

**GitHub Workflow** (`.github/workflows/azure-static-web-apps-*.yml`) handles:
- Building frontend (Vite)
- Building API (Azure Functions v4)
- Deploying both to Azure Static Web Apps

**No manual deployment needed!**

### 6. Verify Deployment

After deployment completes (~2-3 minutes):

1. **Check deployment status:** GitHub Actions tab → Latest workflow run
2. **Test frontend:** Open Static Web App URL
3. **Test API:** Open browser console, check for 200 responses (not 401/404)
4. **Test auth:** Log in with Microsoft account

**Common issues:**
- **401 Unauthorized:** GitHub secret `API_SHARED_KEY` not configured or doesn't match Azure Portal
- **404 Not Found:** API not deployed (check workflow logs)
- **500 Internal Server Error:** Check `AZURE_STORAGE_CONNECTION_STRING` in Azure Portal

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

<<<<<<< HEAD
=======
| timestamp | number | Unix timestamp |

>>>>>>> 9193a99 (refactor: Remove photo feature completely)
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
<<<<<<< HEAD
│   │   ├── ExercisePicker.tsx
│   │   ├── DraggableExerciseList.tsx
=======
│   │   ├── │   │   ├── DraggableExerciseList.tsx
>>>>>>> 9193a99 (refactor: Remove photo feature completely)
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


