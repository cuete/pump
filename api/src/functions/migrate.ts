import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getRoutinesTable, getExercisesTable, getPhotoContainer } from '../lib/storage.js';
import { randomUUID } from 'crypto';

interface OldRoutine {
  id?: number;
  date: string;
  name: string;
  order: number;
}

interface OldExercise {
  id?: number;
  routineId: number;
  name: string;
  repetitions: number;
  weight: number;
  sets: number;
  setsCompleted: number;
  time: string;
  distance: number;
  order: number;
}

interface OldPhoto {
  id?: number;
  exerciseId: number;
  blob: string; // base64
  timestamp: number;
}

interface MigrationData {
  routines: OldRoutine[];
  exercises: OldExercise[];
  photos: OldPhoto[];
}

export async function migrate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const data = await request.json() as MigrationData;

    context.log(`Starting migration for user ${userId}`);
    context.log(`Routines: ${data.routines.length}, Exercises: ${data.exercises.length}, Photos: ${data.photos.length}`);

    const routinesTable = getRoutinesTable();
    const exercisesTable = getExercisesTable();
    const photoContainer = await getPhotoContainer();

    // Map old routine IDs to new GUIDs
    const routineIdMap = new Map<number, string>();

    // 1. Migrate routines
    for (const routine of data.routines) {
      const routineId = randomUUID();
      routineIdMap.set(routine.id!, routineId);

      const rowKey = `${routine.date}_${routineId}`;
      await routinesTable.createEntity({
        partitionKey: userId,
        rowKey: rowKey,
        date: routine.date,
        name: routine.name,
        order: routine.order,
        routineId: routineId,
      });
    }

    // Map old exercise IDs to new GUIDs
    const exerciseIdMap = new Map<number, string>();

    // 2. Migrate exercises
    for (const exercise of data.exercises) {
      const exerciseId = randomUUID();
      exerciseIdMap.set(exercise.id!, exerciseId);

      // Map old routineId to new GUID
      const newRoutineId = routineIdMap.get(exercise.routineId);
      if (!newRoutineId) {
        context.warn(`Exercise ${exercise.id} references unknown routine ${exercise.routineId}`);
        continue;
      }

      const rowKey = `${newRoutineId}_${exerciseId}`;
      await exercisesTable.createEntity({
        partitionKey: userId,
        rowKey: rowKey,
        routineId: newRoutineId,
        exerciseId: exerciseId,
        name: exercise.name,
        repetitions: exercise.repetitions,
        weight: exercise.weight,
        sets: exercise.sets,
        setsCompleted: exercise.setsCompleted,
        time: exercise.time,
        distance: exercise.distance,
        order: exercise.order,
      });
    }

    // 3. Migrate photos
    let photosMigrated = 0;
    for (const photo of data.photos) {
      const newExerciseId = exerciseIdMap.get(photo.exerciseId);
      if (!newExerciseId) {
        context.warn(`Photo ${photo.id} references unknown exercise ${photo.exerciseId}`);
        continue;
      }

      try {
        // Decode base64 blob
        const blobData = Buffer.from(photo.blob, 'base64');

        // Upload to blob storage
        const blobName = `${userId}/${newExerciseId}/${photo.timestamp}.jpg`;
        const blockBlobClient = photoContainer.getBlockBlobClient(blobName);
        await blockBlobClient.upload(blobData, blobData.length, {
          blobHTTPHeaders: {
            blobContentType: 'image/jpeg',
          },
        });

        photosMigrated++;
      } catch (error) {
        context.error(`Failed to migrate photo ${photo.id}:`, error);
      }
    }

    context.log(`Migration complete: ${data.routines.length} routines, ${data.exercises.length} exercises, ${photosMigrated} photos`);

    return {
      status: 200,
      jsonBody: {
        success: true,
        routines: data.routines.length,
        exercises: data.exercises.length,
        photos: photosMigrated,
      },
    };
  } catch (error) {
    context.error('Migration error:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

app.http('migrate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'migrate',
  handler: migrate,
});
