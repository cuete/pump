import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getExercisesTable, ExerciseEntity } from '../lib/storage.js';

export async function getExercises(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const routineId = request.query.get('routineId');

    if (!routineId) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required query parameter: routineId' },
      };
    }

    const tableClient = getExercisesTable();

    // Query exercises by userId and routineId
    const exercises: any[] = [];
    const entities = tableClient.listEntities<ExerciseEntity>({
      queryOptions: { filter: `PartitionKey eq '${userId}' and routineId eq '${routineId}'` },
    });

    for await (const entity of entities) {
      exercises.push({
        id: entity.exerciseId,
        routineId: entity.routineId,
        name: entity.name,
        repetitions: entity.repetitions,
        weight: entity.weight,
        sets: entity.sets,
        setsCompleted: entity.setsCompleted,
        time: entity.time,
        distance: entity.distance,
        order: entity.order,
      });
    }

    // Sort by order
    exercises.sort((a, b) => a.order - b.order);

    return {
      status: 200,
      jsonBody: exercises,
    };
  } catch (error) {
    context.error('Error fetching exercises:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch exercises' },
    };
  }
}

app.http('getExercises', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'exercises',
  handler: getExercises,
});
