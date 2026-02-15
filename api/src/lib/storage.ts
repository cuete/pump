import { TableClient, TableEntity } from '@azure/data-tables';
import { BlobServiceClient, ContainerClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true';

// Table clients
let routinesTableClient: TableClient | null = null;
let exercisesTableClient: TableClient | null = null;

// Blob client
let blobServiceClient: BlobServiceClient | null = null;
let photoContainerClient: ContainerClient | null = null;

/**
 * Get or create the routines table client
 */
export function getRoutinesTable(): TableClient {
  if (!routinesTableClient) {
    routinesTableClient = TableClient.fromConnectionString(connectionString, 'routines');
  }
  return routinesTableClient;
}

/**
 * Get or create the exercises table client
 */
export function getExercisesTable(): TableClient {
  if (!exercisesTableClient) {
    exercisesTableClient = TableClient.fromConnectionString(connectionString, 'exercises');
  }
  return exercisesTableClient;
}

/**
 * Get or create the blob service client
 */
export function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

/**
 * Get or create the exercise photos container client
 */
export async function getPhotoContainer(): Promise<ContainerClient> {
  if (!photoContainerClient) {
    const serviceClient = getBlobServiceClient();
    photoContainerClient = serviceClient.getContainerClient('exercise-photos');

    // Ensure container exists
    await photoContainerClient.createIfNotExists();
  }
  return photoContainerClient;
}

/**
 * Generate a SAS token URL for a blob with read permissions
 * @param blobName - The name of the blob (e.g., userId/exerciseId/timestamp.jpg)
 * @param expiryMinutes - Number of minutes until the SAS token expires (default: 60)
 */
export async function generateSasUrl(blobName: string, expiryMinutes: number = 60): Promise<string> {
  const containerClient = await getPhotoContainer();
  const blobClient = containerClient.getBlobClient(blobName);

  // Parse connection string to get account name and key
  const connStrParts: Record<string, string> = {};
  connectionString.split(';').forEach(part => {
    const [key, ...valueParts] = part.split('=');
    if (key && valueParts.length) {
      connStrParts[key] = valueParts.join('=');
    }
  });

  // For Azurite (local development), return the blob URL without SAS
  if (connectionString.includes('UseDevelopmentStorage=true') || connectionString.includes('127.0.0.1')) {
    return blobClient.url;
  }

  const accountName = connStrParts['AccountName'];
  const accountKey = connStrParts['AccountKey'];

  if (!accountName || !accountKey) {
    throw new Error('Could not extract account credentials from connection string');
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: 'exercise-photos',
      blobName: blobName,
      permissions: BlobSASPermissions.parse('r'), // read-only
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + expiryMinutes * 60 * 1000),
    },
    sharedKeyCredential
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}

/**
 * Routine entity in Table Storage
 */
export interface RoutineEntity extends TableEntity {
  partitionKey: string; // userId
  rowKey: string; // date_routineId (e.g., "2024-02-14_abc123")
  date: string; // YYYY-MM-DD
  name: string;
  order: number;
  routineId: string; // GUID
}

/**
 * Exercise entity in Table Storage
 */
export interface ExerciseEntity extends TableEntity {
  partitionKey: string; // userId
  rowKey: string; // routineId_exerciseId
  routineId: string; // GUID (foreign key)
  exerciseId: string; // GUID (primary identifier)
  name: string;
  repetitions: number;
  weight: number;
  sets: number;
  setsCompleted: number;
  time: string; // mm:ss
  distance: number; // miles
  order: number;
}

/**
 * Create tables if they don't exist
 */
export async function ensureTablesExist(): Promise<void> {
  const routinesTable = getRoutinesTable();
  const exercisesTable = getExercisesTable();

  await Promise.all([
    routinesTable.createTable().catch(() => {}), // Ignore if already exists
    exercisesTable.createTable().catch(() => {}),
  ]);
}
