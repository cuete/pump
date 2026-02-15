import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getExercisesTable, ExerciseEntity, getPhotoContainer } from '../lib/storage.js';

export async function deleteExercise(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const exerciseId = request.params.exerciseId;

    if (!exerciseId) {
      return {
        status: 400,
        jsonBody: { error: 'Missing exerciseId parameter' },
      };
    }

    const tableClient = getExercisesTable();
    const photoContainer = await getPhotoContainer();

    // 1. Delete all photos for this exercise
    const blobPrefix = `${userId}/${exerciseId}/`;
    const blobs = photoContainer.listBlobsFlat({ prefix: blobPrefix });

    let photosDeleted = 0;
    for await (const blob of blobs) {
      await photoContainer.deleteBlob(blob.name);
      photosDeleted++;
    }

    // 2. Find and delete the exercise
    const entities = tableClient.listEntities<ExerciseEntity>({
      queryOptions: { filter: `PartitionKey eq '${userId}' and exerciseId eq '${exerciseId}'` },
    });

    let found = false;
    for await (const entity of entities) {
      await tableClient.deleteEntity(entity.partitionKey, entity.rowKey);
      found = true;
      break;
    }

    if (!found) {
      return {
        status: 404,
        jsonBody: { error: 'Exercise not found' },
      };
    }

    return {
      status: 200,
      jsonBody: { success: true, photosDeleted },
    };
  } catch (error) {
    context.error('Error deleting exercise:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to delete exercise' },
    };
  }
}

app.http('deleteExercise', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'exercises/{exerciseId}',
  handler: deleteExercise,
});
