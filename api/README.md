# Pump API

REST API for Pump workout tracker with Azure Table Storage backend and Shared Key authentication.

## Prerequisites

- Node.js 18+
- Azure Functions Core Tools: `npm install -g azure-functions-core-tools@4`
- Azure Storage Account (or Azurite for local development)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure `local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "<your-connection-string>",
    "API_SHARED_KEY": "<your-shared-key>"
  }
}
```

For local development with Azurite:
- Install Azurite: `npm install -g azurite`
- Start Azurite: `azurite --silent --location ./azurite --debug ./azurite/debug.log`
- Use connection string: `UseDevelopmentStorage=true`

3. Create tables in Azure Storage:
```bash
# Using Azure CLI
az storage table create --name routines --connection-string "<connection-string>"
az storage table create --name exercises --connection-string "<connection-string>"
az storage table create --name exercisePhotos --connection-string "<connection-string>"
```

## Development

Start the Functions runtime:
```bash
npm start
```

API runs at `http://localhost:7071`

## Authentication

All endpoints require `x-api-key` header with the shared key configured in `API_SHARED_KEY`.

Example:
```bash
curl -H "x-api-key: your-shared-key" \
  "http://localhost:7071/api/routines?userId=user123"
```

## API Endpoints

### Routines

- `GET /api/routines?userId={userId}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}` - List routines
- `POST /api/routines?userId={userId}` - Create routine
- `GET /api/routines/{routineId}?userId={userId}` - Get routine
- `PATCH /api/routines/{routineId}?userId={userId}` - Update routine
- `DELETE /api/routines/{routineId}?userId={userId}` - Delete routine

### Exercises

- `GET /api/exercises?userId={userId}&routineId={routineId}` - List exercises
- `POST /api/exercises?userId={userId}` - Create exercise
- `PATCH /api/exercises/{exerciseId}?userId={userId}` - Update exercise
- `DELETE /api/exercises/{exerciseId}?userId={userId}` - Delete exercise

### Photos

- `GET /api/photos?userId={userId}&exerciseId={exerciseId}` - List photos
- `POST /api/photos?userId={userId}` - Create photo
- `DELETE /api/photos/{photoId}?userId={userId}` - Delete photo

## Data Model

### Routine
```typescript
{
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  name: string;
  order: number;
}
```

### Exercise
```typescript
{
  id?: string;
  routineId: string;
  userId: string;
  name: string;
  repetitions: number;
  weight: number;
  sets: number;
  setsCompleted: number;
  time: string; // mm:ss
  distance: number; // miles
  order: number;
}
```

### ExercisePhoto
```typescript
{
  id?: string;
  exerciseId: string;
  userId: string;
  base64Data: string;
  mimeType: string;
  timestamp: number;
}
```

## Deployment

Deploy to Azure Functions:

1. Create Azure Function App (Node.js 18, Windows/Linux)
2. Create Azure Storage Account
3. Configure application settings:
   - `AZURE_STORAGE_CONNECTION_STRING`
   - `API_SHARED_KEY`
4. Deploy:
```bash
func azure functionapp publish <function-app-name>
```

## Storage Schema

Azure Table Storage schema:

**routines table**
- PartitionKey: userId
- RowKey: routineId (auto-generated)
- Fields: date, name, order

**exercises table**
- PartitionKey: userId
- RowKey: exerciseId (auto-generated)
- Fields: routineId, name, repetitions, weight, sets, setsCompleted, time, distance, order

**exercisePhotos table**
- PartitionKey: userId
- RowKey: photoId (auto-generated)
- Fields: exerciseId, base64Data, mimeType, timestamp
