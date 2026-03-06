import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { validateSharedKey, unauthorizedResponse } from "./auth";
import * as storage from "./storage";

async function photosHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    // GET - List photos for an exercise
    if (method === 'GET') {
      const exerciseId = request.query.get('exerciseId');
      
      if (!exerciseId) {
        return {
          status: 400,
          jsonBody: { error: 'exerciseId query parameter is required' }
        };
      }
      
      const photos = await storage.getExercisePhotos(userId, exerciseId);
      
      return {
        status: 200,
        jsonBody: photos
      };
    }

    // POST - Create photo
    if (method === 'POST') {
      const body = await request.json() as storage.ExercisePhoto;
      
      if (!body.exerciseId || !body.base64Data || !body.mimeType) {
        return {
          status: 400,
          jsonBody: { error: 'Missing required fields: exerciseId, base64Data, mimeType' }
        };
      }

      const photo = await storage.createExercisePhoto({
        ...body,
        userId,
        timestamp: body.timestamp || Date.now()
      });
      
      return {
        status: 201,
        jsonBody: photo
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };
  } catch (error: any) {
    context.error('Error in photos handler:', error);
    return {
      status: 500,
      jsonBody: { error: error.message }
    };
  }
}

async function photoHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // Validate authentication
  if (!validateSharedKey(request, context)) {
    return unauthorizedResponse();
  }

  try {
    const method = request.method;
    const userId = request.query.get('userId');
    const photoId = request.params.photoId;
    
    if (!userId) {
      return {
        status: 400,
        jsonBody: { error: 'userId query parameter is required' }
      };
    }

    if (!photoId) {
      return {
        status: 400,
        jsonBody: { error: 'photoId is required' }
      };
    }

    // DELETE - Delete photo
    if (method === 'DELETE') {
      await storage.deleteExercisePhoto(userId, photoId);
      
      return {
        status: 200,
        jsonBody: { message: 'Photo deleted' }
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };
  } catch (error: any) {
    context.error('Error in photo handler:', error);
    return {
      status: 500,
      jsonBody: { error: error.message }
    };
  }
}

app.http('photos', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'photos',
  handler: photosHandler
});

app.http('photo', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'photos/{photoId}',
  handler: photoHandler
});
