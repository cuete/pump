import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getExercisesTable } from '../lib/storage.js';
import { randomUUID } from 'crypto';

export async function createExercise(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const body = await request.json() as any;

    const { routineId, name, repetitions, weight, sets, setsCompleted, time, distance, order } = body;

    if (!routineId || !name || order === undefined) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields: routineId, name, order' },
      };
    }

    const exerciseId = randomUUID();
    const tableClient = getExercisesTable();

    // RowKey format: routineId_exerciseId
    const rowKey = `${routineId}_${exerciseId}`;

    const entity = {
      partitionKey: userId,
      rowKey: rowKey,
      routineId: routineId,
      exerciseId: exerciseId,
      name: name,
      repetitions: Number(repetitions || 0),
      weight: Number(weight || 0),
      sets: Number(sets || 0),
      setsCompleted: Number(setsCompleted || 0),
      time: time || '00:00',
      distance: Number(distance || 0),
      order: Number(order),
    };

    await tableClient.createEntity(entity);

    return {
      status: 201,
      jsonBody: {
        id: exerciseId,
        routineId,
        name,
        repetitions: entity.repetitions,
        weight: entity.weight,
        sets: entity.sets,
        setsCompleted: entity.setsCompleted,
        time: entity.time,
        distance: entity.distance,
        order: entity.order,
      },
    };
  } catch (error) {
    context.error('Error creating exercise:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to create exercise' },
    };
  }
}

app.http('createExercise', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'exercises',
  handler: createExercise,
});
