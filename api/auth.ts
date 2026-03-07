import { HttpRequest, InvocationContext } from "@azure/functions";

export function validateSharedKey(request: HttpRequest, context: InvocationContext): boolean {
  const expectedKey = process.env.API_SHARED_KEY;
  
  if (!expectedKey) {
    context.error('API_SHARED_KEY not configured');
    return false;
  }

  const authHeader = request.headers.get('x-api-key');
  
  if (!authHeader) {
    context.warn('Missing x-api-key header');
    return false;
  }

  if (authHeader !== expectedKey) {
    context.warn('Invalid x-api-key');
    return false;
  }

  return true;
}

export function unauthorizedResponse() {
  return {
    status: 401,
    jsonBody: { error: 'Unauthorized' }
  };
}
