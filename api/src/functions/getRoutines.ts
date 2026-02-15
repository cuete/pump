import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getRoutinesTable, RoutineEntity } from '../lib/storage.js';

export async function getRoutines(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const date = request.query.get('date');

    if (!date) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required query parameter: date' },
      };
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid date format. Expected YYYY-MM-DD' },
      };
    }

    const tableClient = getRoutinesTable();

    // Query routines by userId (partitionKey) and filter by date
    const routines: any[] = [];
    const entities = tableClient.listEntities<RoutineEntity>({
      queryOptions: { filter: `PartitionKey eq '${userId}' and date eq '${date}'` },
    });

    for await (const entity of entities) {
      routines.push({
        id: entity.routineId,
        date: entity.date,
        name: entity.name,
        order: entity.order,
      });
    }

    // Sort by order
    routines.sort((a, b) => a.order - b.order);

    return {
      status: 200,
      jsonBody: routines,
    };
  } catch (error) {
    context.error('Error fetching routines:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch routines' },
    };
  }
}

app.http('getRoutines', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'routines',
  handler: getRoutines,
});
