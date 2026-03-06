# Migration Guide: IndexedDB to Azure Table Storage

This guide explains how to migrate from the previous IndexedDB-based version to the new API-based architecture.

## What Changed

### Before (v1.x)
- Data stored client-side in browser IndexedDB
- Single-user per browser
- No server-side component
- Dexie.js for database access

### After (v2.0)
- Data stored server-side in Azure Table Storage
- Multi-user support with userId partitioning
- RESTful API with Shared Key authentication
- API client wraps HTTP calls

## Architecture Changes

```
Before:
[Browser] → [IndexedDB]

After:
[Browser] → [API] → [Azure Table Storage]
            ↑
         Shared Key Auth
```

## Key Differences

1. **Authentication:**
   - UI: Still uses Azure SWA (Microsoft SSO) - **no changes**
   - API: New Shared Key authentication via `x-api-key` header

2. **Data Storage:**
   - Moved from client-side (IndexedDB) to server-side (Table Storage)
   - Each user's data is partitioned by `userId`

3. **IDs:**
   - IndexedDB used auto-increment integers
   - Table Storage uses string-based RowKeys
   - API converts between them for frontend compatibility

4. **Photos:**
   - Previously stored as Blob in IndexedDB
   - Now stored as base64 strings in Table Storage

## Breaking Changes

- `db.ts` API is mostly compatible, but uses HTTP under the hood
- Photo retrieval is now async (always was, no functional change)
- Table Storage limits: 1MB per entity (photos should be compressed)

## Migration Steps

### For Developers

1. **Update environment configuration:**

   Create `.env`:
   ```env
   VITE_API_URL=http://localhost:7071/api
   VITE_API_KEY=dev-shared-key-123
   ```

   Create `api/local.settings.json`:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
       "API_SHARED_KEY": "dev-shared-key-123"
     }
   }
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd api && npm install && cd ..
   ```

3. **Start Azurite:**
   ```bash
   azurite --silent --location ./azurite
   ```

4. **Create tables:**
   ```bash
   az storage table create --name routines --connection-string "UseDevelopmentStorage=true"
   az storage table create --name exercises --connection-string "UseDevelopmentStorage=true"
   az storage table create --name exercisePhotos --connection-string "UseDevelopmentStorage=true"
   ```

5. **Run API and UI:**
   ```bash
   # Terminal 1
   cd api && npm start
   
   # Terminal 2
   npm run dev
   ```

### For Users

**Data Migration Options:**

#### Option 1: Manual Re-entry
If you have limited data, the simplest approach is to re-enter it in the new version.

#### Option 2: Export/Import Script
Create a migration script to export from IndexedDB and import via API:

```javascript
// export-data.js - Run in browser console on OLD version
async function exportData() {
  const { db } = await import('./src/db.ts');
  
  const routines = await db.routines.toArray();
  const exercises = await db.exercises.toArray();
  const photos = await db.exercisePhotos.toArray();
  
  // Convert photos to base64
  const photosWithBase64 = await Promise.all(
    photos.map(async (p) => ({
      ...p,
      base64: await blobToBase64(p.blob),
      mimeType: p.blob.type
    }))
  );
  
  const exportData = {
    routines,
    exercises,
    photos: photosWithBase64
  };
  
  // Download as JSON
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pump-export.json';
  a.click();
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

exportData();
```

```javascript
// import-data.js - Run via Node.js with NEW version API
const fs = require('fs');
const fetch = require('node-fetch');

const API_URL = 'http://localhost:7071/api';
const API_KEY = 'dev-shared-key-123';
const USER_ID = 'your-user-id'; // Get from Azure SWA auth

async function importData(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  };
  
  // Import routines
  const routineIdMap = new Map();
  for (const routine of data.routines) {
    const res = await fetch(`${API_URL}/routines?userId=${USER_ID}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: routine.date,
        name: routine.name,
        order: routine.order,
        userId: USER_ID
      })
    });
    const created = await res.json();
    routineIdMap.set(routine.id, created.id);
  }
  
  // Import exercises
  const exerciseIdMap = new Map();
  for (const exercise of data.exercises) {
    const newRoutineId = routineIdMap.get(exercise.routineId);
    const res = await fetch(`${API_URL}/exercises?userId=${USER_ID}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...exercise,
        routineId: newRoutineId,
        userId: USER_ID
      })
    });
    const created = await res.json();
    exerciseIdMap.set(exercise.id, created.id);
  }
  
  // Import photos
  for (const photo of data.photos) {
    const newExerciseId = exerciseIdMap.get(photo.exerciseId);
    await fetch(`${API_URL}/photos?userId=${USER_ID}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        exerciseId: newExerciseId,
        base64Data: photo.base64,
        mimeType: photo.mimeType,
        timestamp: photo.timestamp,
        userId: USER_ID
      })
    });
  }
  
  console.log('Import complete!');
}

importData('pump-export.json');
```

## Rollback

To rollback to the previous version:

```bash
git checkout save-x  # or whichever branch had the old version
```

The old version will continue to work with its IndexedDB data unchanged.

## Production Deployment

See main [README.md](README.md) for Azure deployment instructions.

Key considerations:
- Use strong Shared Keys in production
- Configure CORS properly on Function App
- Set appropriate Table Storage retention policies
- Monitor API usage and costs

## Support

If you encounter issues during migration:
1. Check browser console for errors
2. Check Function App logs in Azure Portal
3. Verify API_KEY matches between frontend and backend
4. Ensure tables exist in Storage Account
