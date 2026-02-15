import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getRoutinesTable } from '../lib/storage.js';
import { randomUUID } from 'crypto';

export async function createRoutine(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const body = await request.json() as any;

    const { date, name, order } = body;

    if (!date || !name || order === undefined) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields: date, name, order' },
      };
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid date format. Expected YYYY-MM-DD' },
      };
    }

    const routineId = randomUUID();
    const tableClient = getRoutinesTable();

    // RowKey format: date_routineId for easy querying
    const rowKey = `${date}_${routineId}`;

    const entity = {
      partitionKey: userId,
      rowKey: rowKey,
      date: date,
      name: name,
      order: Number(order),
      routineId: routineId,
    };

    await tableClient.createEntity(entity);

    return {
      status: 201,
      jsonBody: {
        id: routineId,
        date,
        name,
        order,
      },
    };
  } catch (error) {
    context.error('Error creating routine:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to create routine' },
    };
  }
}

app.http('createRoutine', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'routines',
  handler: createRoutine,
});
