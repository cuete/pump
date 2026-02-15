import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getRoutinesTable, getExercisesTable, ExerciseEntity, RoutineEntity, getPhotoContainer } from '../lib/storage.js';

export async function deleteRoutine(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const routineId = request.params.routineId;

    if (!routineId) {
      return {
        status: 400,
        jsonBody: { error: 'Missing routineId parameter' },
      };
    }

    const routinesTable = getRoutinesTable();
    const exercisesTable = getExercisesTable();
    const photoContainer = await getPhotoContainer();

    // 1. Find and delete all exercises for this routine
    const exercises = exercisesTable.listEntities<ExerciseEntity>({
      queryOptions: { filter: `PartitionKey eq '${userId}' and routineId eq '${routineId}'` },
    });

    const exerciseIds: string[] = [];
    for await (const exercise of exercises) {
      exerciseIds.push(exercise.exerciseId);

      // Delete exercise from table
      await exercisesTable.deleteEntity(exercise.partitionKey, exercise.rowKey);
    }

    // 2. Delete all photos for these exercises
    for (const exerciseId of exerciseIds) {
      const blobPrefix = `${userId}/${exerciseId}/`;

      // List all blobs with this prefix
      const blobs = photoContainer.listBlobsFlat({ prefix: blobPrefix });

      for await (const blob of blobs) {
        await photoContainer.deleteBlob(blob.name);
      }
    }

    // 3. Find and delete the routine
    const routines = routinesTable.listEntities<RoutineEntity>({
      queryOptions: { filter: `PartitionKey eq '${userId}' and routineId eq '${routineId}'` },
    });

    let found = false;
    for await (const routine of routines) {
      await routinesTable.deleteEntity(routine.partitionKey, routine.rowKey);
      found = true;
      break;
    }

    if (!found) {
      return {
        status: 404,
        jsonBody: { error: 'Routine not found' },
      };
    }

    return {
      status: 200,
      jsonBody: { success: true, deletedExercises: exerciseIds.length },
    };
  } catch (error) {
    context.error('Error deleting routine:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to delete routine' },
    };
  }
}

app.http('deleteRoutine', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'routines/{routineId}',
  handler: deleteRoutine,
});
