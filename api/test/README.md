# API Tests

## Unit Tests

Run unit tests with mocked dependencies:

```bash
npm test
```

## Integration Tests

For full integration testing with Azure Table Storage:

### 1. Install Azurite (Azure Storage Emulator)

```bash
npm install -g azurite
```

### 2. Start Azurite

```bash
azurite --silent --location ./azurite --debug ./azurite/debug.log
```

### 3. Set Environment Variables

Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "API_SHARED_KEY": "test-key"
  }
}
```

### 4. Create Tables

```bash
# Using Azure CLI
az storage table create --name routines --connection-string "UseDevelopmentStorage=true"
az storage table create --name exercises --connection-string "UseDevelopmentStorage=true"
```

Or use [Azure Storage Explorer](https://azure.microsoft.com/en-us/products/storage/storage-explorer/) (GUI).

### 5. Run Integration Tests

```bash
# Set environment
export AZURE_STORAGE_CONNECTION_STRING="UseDevelopmentStorage=true"
export API_SHARED_KEY="test-key"

# Run tests
npm test
```

## Test Coverage

Generate coverage report:

```bash
npm run test:coverage
```

View HTML report in `coverage/index.html`.

## Skipped Tests

Some tests are marked `.skip()` because they require module state reset or integration testing:

- Table initialization tests → Run against Azurite
- Connection string validation → Run against Azurite

These should be run as integration tests in a CI/CD environment with Azurite running.
