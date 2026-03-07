import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { validateSharedKey, unauthorizedResponse } from "./auth";
import * as storage from "./storage";

async function exercisesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // Validate authentication
  if (!validateSharedKey(request, context)) {
    return unauthorizedResponse();
  }

  try {
    const method = request.method;
    const userId = request.query.get('userId');
    
    if (!userId) {
      return {
        status: 400,
        jsonBody: { error: 'userId query parameter is required' }
      };
    }

    // GET - List exercises
    if (method === 'GET') {
      const routineId = request.query.get('routineId');
      const exercises = await storage.getExercises(userId, routineId || undefined);
      
      return {
        status: 200,
        jsonBody: exercises
      };
    }

    // POST - Create exercise
    if (method === 'POST') {
      const body = await request.json() as storage.Exercise;
      
      if (!body.routineId || !body.name || body.order === undefined) {
        return {
          status: 400,
          jsonBody: { error: 'Missing required fields: routineId, name, order' }
        };
      }

      const exercise = await storage.createExercise({
        ...body,
        userId,
        repetitions: body.repetitions || 0,
        weight: body.weight || 0,
        sets: body.sets || 0,
        setsCompleted: body.setsCompleted || 0,
        time: body.time || '00:00',
        distance: body.distance || 0
      });
      
      return {
        status: 201,
        jsonBody: exercise
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };
  } catch (error: any) {
    context.error('Error in exercises handler:', error);
    return {
      status: 500,
      jsonBody: { error: error.message }
    };
  }
}

async function exerciseHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // Validate authentication
  if (!validateSharedKey(request, context)) {
    return unauthorizedResponse();
  }

  try {
    const method = request.method;
    const userId = request.query.get('userId');
    const exerciseId = request.params.exerciseId;
    
    if (!userId) {
      return {
        status: 400,
        jsonBody: { error: 'userId query parameter is required' }
      };
    }

    if (!exerciseId) {
      return {
        status: 400,
        jsonBody: { error: 'exerciseId is required' }
      };
    }

    // PATCH - Update exercise
    if (method === 'PATCH') {
      const updates = await request.json() as Partial<storage.Exercise>;
      await storage.updateExercise(userId, exerciseId, updates);
      
      return {
        status: 200,
        jsonBody: { message: 'Exercise updated' }
      };
    }

    // DELETE - Delete exercise
    if (method === 'DELETE') {
      await storage.deleteExercise(userId, exerciseId);
      
      return {
        status: 200,
        jsonBody: { message: 'Exercise deleted' }
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };
  } catch (error: any) {
    context.error('Error in exercise handler:', error);
    return {
      status: 500,
      jsonBody: { error: error.message }
    };
  }
}

app.http('exercises', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'exercises',
  handler: exercisesHandler
});

app.http('exercise', {
  methods: ['PATCH', 'DELETE'],
  authLevel: 'anonymous',
  route: 'exercises/{exerciseId}',
  handler: exerciseHandler
});
