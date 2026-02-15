# Azure Setup Guide for Pump

This guide walks you through setting up the Azure resources required for the Pump workout tracker's server-side storage.

## Prerequisites

- Azure CLI installed and logged in: `az login`
- An existing Azure Static Web App (already configured)
- Azure subscription with appropriate permissions

## Step 1: Create Azure Storage Account

The storage account will host both Table Storage (for routine/exercise data) and Blob Storage (for photos).

```bash
# Set your resource group and location
RESOURCE_GROUP="your-resource-group"
LOCATION="eastus"
STORAGE_ACCOUNT_NAME="pumpstorageacct"  # Must be globally unique, lowercase, no hyphens

# Create the storage account
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2
```

## Step 2: Get Connection String

```bash
# Get the connection string (save this for later)
CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --output tsv)

echo "Connection String: $CONNECTION_STRING"
```

## Step 3: Create Tables and Blob Container

```bash
# Create the 'routines' table
az storage table create \
  --name routines \
  --connection-string "$CONNECTION_STRING"

# Create the 'exercises' table
az storage table create \
  --name exercises \
  --connection-string "$CONNECTION_STRING"

# Create the 'exercise-photos' blob container
az storage container create \
  --name exercise-photos \
  --connection-string "$CONNECTION_STRING" \
  --public-access off
```

## Step 4: Configure CORS for Blob Storage

Allow your Static Web App domain to access the blob storage.

```bash
# Replace with your actual Static Web App URL
SWA_URL="https://agreeable-pebble-0216f2f1e.5.azurestaticapps.net"

az storage cors add \
  --services b \
  --methods GET POST DELETE \
  --origins $SWA_URL \
  --allowed-headers "*" \
  --connection-string "$CONNECTION_STRING"
```

## Step 5: Configure Azure Static Web App Settings

Add the storage connection string to your Static Web App's application settings.

### Option A: Azure Portal
1. Go to Azure Portal → Your Static Web App
2. Navigate to "Configuration" → "Application settings"
3. Add a new setting:
   - Name: `AZURE_STORAGE_CONNECTION_STRING`
   - Value: (paste the connection string from Step 2)
4. Click "Save"

### Option B: Azure CLI
```bash
SWA_NAME="your-static-web-app-name"

az staticwebapp appsettings set \
  --name $SWA_NAME \
  --resource-group $RESOURCE_GROUP \
  --setting-names AZURE_STORAGE_CONNECTION_STRING="$CONNECTION_STRING"
```

## Step 6: Deploy the Application

The GitHub Actions workflow is already configured to deploy both the frontend and API.

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Add server-side storage with Azure Functions"
   git push origin main
   ```

2. Monitor the deployment in GitHub Actions
3. Once deployed, visit your Static Web App URL

## Step 7: Data Migration (For Existing Users)

If you have existing data in IndexedDB:

1. Log in to your app
2. A migration banner will appear at the top
3. Click "Migrate Data to Cloud"
4. Wait for the migration to complete

The migration will:
- Export all routines, exercises, and photos from IndexedDB
- Upload them to Azure Storage
- Preserve all relationships and ordering

## Local Development

For local development with Azurite (Azure Storage Emulator):

### 1. Install Azurite
```bash
npm install -g azurite
```

### 2. Start Azurite
```bash
azurite --silent --location ./azurite-data
```

### 3. Start the API
```bash
cd api
npm install
npm start
```

### 4. Start the Frontend
```bash
cd ..
npm run dev
```

The local API will use `UseDevelopmentStorage=true` and connect to Azurite instead of Azure.

## Architecture

### Data Storage

**Azure Table Storage** (2 tables):
- `routines`: Stores workout routines
  - PartitionKey: `userId`
  - RowKey: `{date}_{routineId}`

- `exercises`: Stores exercises within routines
  - PartitionKey: `userId`
  - RowKey: `{routineId}_{exerciseId}`

**Azure Blob Storage** (1 container):
- `exercise-photos`: Stores exercise photos
  - Path: `{userId}/{exerciseId}/{timestamp}.jpg`
  - Access: Private with SAS token URLs (60-minute expiry)

### API Endpoints

All endpoints require authentication via Azure AD:

**Routines**
- `GET /api/routines?date={YYYY-MM-DD}` - Get routines for a date
- `POST /api/routines` - Create routine
- `PATCH /api/routines/{routineId}` - Update routine name
- `DELETE /api/routines/{routineId}` - Delete routine (cascades to exercises and photos)

**Exercises**
- `GET /api/exercises?routineId={id}` - Get exercises for a routine
- `POST /api/exercises` - Create exercise
- `PATCH /api/exercises/{exerciseId}` - Update exercise
- `DELETE /api/exercises/{exerciseId}` - Delete exercise (cascades to photos)

**Photos**
- `GET /api/photos?exerciseId={id}` - Get photo URLs with SAS tokens
- `POST /api/photos` - Upload photo (multipart/form-data)
- `DELETE /api/photos/{photoId}` - Delete photo

**Migration**
- `POST /api/migrate` - One-time migration from IndexedDB to Azure Storage

## Cost Estimation

For 100 users with typical usage:

- **Table Storage**: ~100MB × $0.05/GB = **$0.005/month**
- **Blob Storage**: ~1GB photos × $0.018/GB = **$0.018/month**
- **Transactions**: ~10k/month × $0.004/10k = **$0.004/month**
- **Azure Functions**: Free tier covers 1M executions/month
- **Total**: **~$0.03/month** (or $0.36/year)

## Monitoring

### Azure Portal
1. Go to your Storage Account → Monitoring → Metrics
2. Add charts for:
   - Transaction count
   - Blob capacity
   - Table capacity
3. Set up budget alerts

### Cost Management
1. Go to Cost Management → Budgets
2. Create a budget alert (e.g., alert if cost exceeds $1/month)

## Troubleshooting

### API returns 401 Unauthorized
- Verify Azure AD authentication is configured in `staticwebapp.config.json`
- Check that the user is logged in

### Photos not uploading
- Verify CORS is configured on the blob storage account
- Check the browser console for CORS errors
- Ensure the connection string is correctly set in app settings

### Migration fails
- Check the browser console for errors
- Verify the API logs in Azure Portal → Static Web App → Functions → Monitor
- Ensure IndexedDB has data to migrate

### Local development not working
- Ensure Azurite is running: `azurite --silent`
- Check that `local.settings.json` has `UseDevelopmentStorage=true`
- Restart the API: `cd api && npm start`

## Security

- **User Isolation**: All data is partitioned by `userId` extracted from Azure AD token
- **Authentication**: All API endpoints require authenticated users (enforced by Static Web App)
- **Photo Access**: Photos use SAS tokens with 60-minute expiry for secure, time-limited access
- **Validation**: All user inputs are validated on the server side

## Next Steps

- [ ] Set up automated backups (export Table Storage weekly)
- [ ] Add monitoring and alerting for API errors
- [ ] Consider Azure CDN for photo delivery (if usage grows)
- [ ] Set up staging environment for testing updates
