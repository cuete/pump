import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getExercisesTable, ExerciseEntity } from '../lib/storage.js';

export async function updateExercise(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const exerciseId = request.params.exerciseId;
    const body = await request.json() as any;

    if (!exerciseId) {
      return {
        status: 400,
        jsonBody: { error: 'Missing exerciseId parameter' },
      };
    }

    const tableClient = getExercisesTable();

    // Find the exercise by userId and exerciseId
    const entities = tableClient.listEntities<ExerciseEntity>({
      queryOptions: { filter: `PartitionKey eq '${userId}' and exerciseId eq '${exerciseId}'` },
    });

    let found = false;
    for await (const entity of entities) {
      // Build update object with only provided fields
      const updateData: any = {
        partitionKey: entity.partitionKey,
        rowKey: entity.rowKey,
      };

      // Update only the fields provided in the request body
      if (body.name !== undefined) updateData.name = body.name;
      if (body.repetitions !== undefined) updateData.repetitions = Number(body.repetitions);
      if (body.weight !== undefined) updateData.weight = Number(body.weight);
      if (body.sets !== undefined) updateData.sets = Number(body.sets);
      if (body.setsCompleted !== undefined) updateData.setsCompleted = Number(body.setsCompleted);
      if (body.time !== undefined) updateData.time = body.time;
      if (body.distance !== undefined) updateData.distance = Number(body.distance);
      if (body.order !== undefined) updateData.order = Number(body.order);

      await tableClient.updateEntity(updateData, 'Merge');

      found = true;
      break; // Only one exercise should match
    }

    if (!found) {
      return {
        status: 404,
        jsonBody: { error: 'Exercise not found' },
      };
    }

    return {
      status: 200,
      jsonBody: { success: true },
    };
  } catch (error) {
    context.error('Error updating exercise:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to update exercise' },
    };
  }
}

app.http('updateExercise', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'exercises/{exerciseId}',
  handler: updateExercise,
});
