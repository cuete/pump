import { HttpRequest } from '@azure/functions';

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

/**
 * Extract the authenticated user's ID from Azure Static Web Apps authentication header.
 * The header 'x-ms-client-principal' contains a base64-encoded JSON object with user info.
 *
 * @param request - The HTTP request object
 * @returns The userId string
 * @throws Error if user is not authenticated or userId cannot be extracted
 */
export function getUserId(request: HttpRequest): string {
  const header = request.headers.get('x-ms-client-principal');

  if (!header) {
    throw new Error('Unauthorized: No authentication header found');
  }

  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    const principal: ClientPrincipal = JSON.parse(decoded);

    if (!principal.userId) {
      throw new Error('Unauthorized: userId not found in authentication token');
    }

    return principal.userId;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      throw error;
    }
    throw new Error('Unauthorized: Invalid authentication token');
  }
}

/**
 * Development helper: Check if running locally and return a dev userId.
 * In production, this will use the actual Azure AD authentication.
 *
 * @param request - The HTTP request object
 * @returns The userId (dev user if local, authenticated user if production)
 */
export function getUserIdWithDevFallback(request: HttpRequest): string {
  // Check if running in local development (Azurite)
  const isLocal = process.env.AZURE_STORAGE_CONNECTION_STRING === 'UseDevelopmentStorage=true';

  if (isLocal) {
    // Return a consistent dev userId for local testing
    return 'dev-user-123';
  }

  return getUserId(request);
}
