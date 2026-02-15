import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getRoutinesTable, RoutineEntity } from '../lib/storage.js';

export async function updateRoutine(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const routineId = request.params.routineId;
    const body = await request.json() as any;

    if (!routineId) {
      return {
        status: 400,
        jsonBody: { error: 'Missing routineId parameter' },
      };
    }

    const { name } = body;

    if (!name) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required field: name' },
      };
    }

    const tableClient = getRoutinesTable();

    // Find the routine by userId and routineId
    const entities = tableClient.listEntities<RoutineEntity>({
      queryOptions: { filter: `PartitionKey eq '${userId}' and routineId eq '${routineId}'` },
    });

    let found = false;
    for await (const entity of entities) {
      // Update the name
      await tableClient.updateEntity({
        partitionKey: entity.partitionKey,
        rowKey: entity.rowKey,
        name: name,
      }, 'Merge');

      found = true;
      break; // Only one routine should match
    }

    if (!found) {
      return {
        status: 404,
        jsonBody: { error: 'Routine not found' },
      };
    }

    return {
      status: 200,
      jsonBody: { success: true },
    };
  } catch (error) {
    context.error('Error updating routine:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to update routine' },
    };
  }
}

app.http('updateRoutine', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'routines/{routineId}',
  handler: updateRoutine,
});
