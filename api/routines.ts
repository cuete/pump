import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { validateSharedKey, unauthorizedResponse } from "./auth";
import * as storage from "./storage";

async function routinesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    // GET - List routines
    if (method === 'GET') {
      const startDate = request.query.get('startDate');
      const endDate = request.query.get('endDate');
      const routines = await storage.getRoutines(userId, startDate || undefined, endDate || undefined);
      
      return {
        status: 200,
        jsonBody: routines
      };
    }

    // POST - Create routine
    if (method === 'POST') {
      const body = await request.json() as storage.Routine;
      
      if (!body.date || !body.name || body.order === undefined) {
        return {
          status: 400,
          jsonBody: { error: 'Missing required fields: date, name, order' }
        };
      }

      const routine = await storage.createRoutine({
        ...body,
        userId
      });
      
      return {
        status: 201,
        jsonBody: routine
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };
  } catch (error: any) {
    context.error('Error in routines handler:', error);
    return {
      status: 500,
      jsonBody: { error: error.message }
    };
  }
}

async function routineHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // Validate authentication
  if (!validateSharedKey(request, context)) {
    return unauthorizedResponse();
  }

  try {
    const method = request.method;
    const userId = request.query.get('userId');
    const routineId = request.params.routineId;
    
    if (!userId) {
      return {
        status: 400,
        jsonBody: { error: 'userId query parameter is required' }
      };
    }

    if (!routineId) {
      return {
        status: 400,
        jsonBody: { error: 'routineId is required' }
      };
    }

    // GET - Get single routine
    if (method === 'GET') {
      const routine = await storage.getRoutine(userId, routineId);
      
      if (!routine) {
        return {
          status: 404,
          jsonBody: { error: 'Routine not found' }
        };
      }
      
      return {
        status: 200,
        jsonBody: routine
      };
    }

    // PATCH - Update routine
    if (method === 'PATCH') {
      const updates = await request.json() as Partial<storage.Routine>;
      
      context.log(`PATCH routine - userId: ${userId}, routineId: ${routineId}`);
      
      // Verify routine exists first
      const existing = await storage.getRoutine(userId, routineId);
      if (!existing) {
        context.warn(`Routine not found - userId: ${userId}, routineId: ${routineId}`);
        return {
          status: 404,
          jsonBody: { error: 'Routine not found' }
        };
      }
      
      await storage.updateRoutine(userId, routineId, updates);
      
      return {
        status: 200,
        jsonBody: { message: 'Routine updated' }
      };
    }

    // DELETE - Delete routine
    if (method === 'DELETE') {
      context.log(`DELETE routine - userId: ${userId}, routineId: ${routineId}`);
      
      // Verify routine exists first
      const existing = await storage.getRoutine(userId, routineId);
      if (!existing) {
        context.warn(`Routine not found - userId: ${userId}, routineId: ${routineId}`);
        return {
          status: 404,
          jsonBody: { error: 'Routine not found' }
        };
      }
      
      await storage.deleteRoutine(userId, routineId);
      
      return {
        status: 200,
        jsonBody: { message: 'Routine deleted' }
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };
  } catch (error: any) {
    context.error('Error in routine handler:', error);
    return {
      status: 500,
      jsonBody: { error: error.message }
    };
  }
}

app.http('routines', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'routines',
  handler: routinesHandler
});

app.http('routine', {
  methods: ['GET', 'PATCH', 'DELETE'],
  authLevel: 'anonymous',
  route: 'routines/{routineId}',
  handler: routineHandler
});
