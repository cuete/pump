import { TableClient, AzureNamedKeyCredential, odata } from "@azure/data-tables";

// Types matching the frontend
export interface Routine {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  name: string;
  order: number;
}

export interface Exercise {
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

export interface ExercisePhoto {
  id?: string;
  exerciseId: string;
  userId: string;
  base64Data: string;
  mimeType: string;
  timestamp: number;
}

// Table Storage entity conversion
function toTableEntity<T extends { id?: string }>(
  partitionKey: string,
  entity: T,
  rowKey?: string
): any {
  const { id, ...rest } = entity;
  return {
    partitionKey,
    rowKey: rowKey || id || generateId(),
    ...rest,
  };
}

function fromTableEntity<T>(entity: any): T {
  const { partitionKey, rowKey, timestamp, etag, ...rest } = entity;
  return {
    id: rowKey,
    ...rest,
  } as T;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Storage clients
let routinesClient: TableClient;
let exercisesClient: TableClient;
let photosClient: TableClient;

function initClients() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
  }

  routinesClient = TableClient.fromConnectionString(connectionString, 'routines');
  exercisesClient = TableClient.fromConnectionString(connectionString, 'exercises');
  photosClient = TableClient.fromConnectionString(connectionString, 'exercisePhotos');
}

// Routines operations
export async function getRoutines(userId: string, startDate?: string, endDate?: string): Promise<Routine[]> {
  if (!routinesClient) initClients();
  
  let filter = `PartitionKey eq '${userId}'`;
  if (startDate && endDate) {
    filter += ` and date ge '${startDate}' and date le '${endDate}'`;
  }
  
  const entities = routinesClient.listEntities({ queryOptions: { filter } });
  const routines: Routine[] = [];
  
  for await (const entity of entities) {
    routines.push(fromTableEntity<Routine>(entity));
  }
  
  return routines.sort((a, b) => a.order - b.order);
}

export async function getRoutine(userId: string, routineId: string): Promise<Routine | null> {
  if (!routinesClient) initClients();
  
  try {
    const entity = await routinesClient.getEntity(userId, routineId);
    return fromTableEntity<Routine>(entity);
  } catch (error: any) {
    if (error.statusCode === 404) return null;
    throw error;
  }
}

export async function createRoutine(routine: Routine): Promise<Routine> {
  if (!routinesClient) initClients();
  
  const entity = toTableEntity(routine.userId, routine);
  await routinesClient.createEntity(entity);
  
  return {
    ...routine,
    id: entity.rowKey,
  };
}

export async function updateRoutine(userId: string, routineId: string, updates: Partial<Routine>): Promise<void> {
  if (!routinesClient) initClients();
  
  const entity = toTableEntity(userId, updates as Routine, routineId);
  await routinesClient.updateEntity(entity, 'Merge');
}

export async function deleteRoutine(userId: string, routineId: string): Promise<void> {
  if (!routinesClient) initClients();
  
  await routinesClient.deleteEntity(userId, routineId);
  
  // Also delete associated exercises
  const exercises = await getExercises(userId, routineId);
  for (const exercise of exercises) {
    await deleteExercise(userId, exercise.id!);
  }
}

// Exercises operations
export async function getExercises(userId: string, routineId?: string): Promise<Exercise[]> {
  if (!exercisesClient) initClients();
  
  let filter = `PartitionKey eq '${userId}'`;
  if (routineId) {
    filter += ` and routineId eq '${routineId}'`;
  }
  
  const entities = exercisesClient.listEntities({ queryOptions: { filter } });
  const exercises: Exercise[] = [];
  
  for await (const entity of entities) {
    exercises.push(fromTableEntity<Exercise>(entity));
  }
  
  return exercises.sort((a, b) => a.order - b.order);
}

export async function createExercise(exercise: Exercise): Promise<Exercise> {
  if (!exercisesClient) initClients();
  
  const entity = toTableEntity(exercise.userId, exercise);
  await exercisesClient.createEntity(entity);
  
  return {
    ...exercise,
    id: entity.rowKey,
  };
}

export async function updateExercise(userId: string, exerciseId: string, updates: Partial<Exercise>): Promise<void> {
  if (!exercisesClient) initClients();
  
  const entity = toTableEntity(userId, updates as Exercise, exerciseId);
  await exercisesClient.updateEntity(entity, 'Merge');
}

export async function deleteExercise(userId: string, exerciseId: string): Promise<void> {
  if (!exercisesClient) initClients();
  
  await exercisesClient.deleteEntity(userId, exerciseId);
  
  // Also delete associated photos
  const photos = await getExercisePhotos(userId, exerciseId);
  for (const photo of photos) {
    await deleteExercisePhoto(userId, photo.id!);
  }
}

// Exercise Photos operations
export async function getExercisePhotos(userId: string, exerciseId: string): Promise<ExercisePhoto[]> {
  if (!photosClient) initClients();
  
  const filter = `PartitionKey eq '${userId}' and exerciseId eq '${exerciseId}'`;
  const entities = photosClient.listEntities({ queryOptions: { filter } });
  const photos: ExercisePhoto[] = [];
  
  for await (const entity of entities) {
    photos.push(fromTableEntity<ExercisePhoto>(entity));
  }
  
  return photos.sort((a, b) => a.timestamp - b.timestamp);
}

export async function createExercisePhoto(photo: ExercisePhoto): Promise<ExercisePhoto> {
  if (!photosClient) initClients();
  
  const entity = toTableEntity(photo.userId, photo);
  await photosClient.createEntity(entity);
  
  return {
    ...photo,
    id: entity.rowKey,
  };
}

export async function deleteExercisePhoto(userId: string, photoId: string): Promise<void> {
  if (!photosClient) initClients();
  
  await photosClient.deleteEntity(userId, photoId);
}
