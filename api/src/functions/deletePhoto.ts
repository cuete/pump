import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getPhotoContainer } from '../lib/storage.js';

export async function deletePhoto(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const photoId = request.params.photoId;

    if (!photoId) {
      return {
        status: 400,
        jsonBody: { error: 'Missing photoId parameter' },
      };
    }

    // Decode the photoId (it's URL-encoded blob name: userId/exerciseId/timestamp.jpg)
    const blobName = decodeURIComponent(photoId);

    // Verify that the blob belongs to the authenticated user (security check)
    if (!blobName.startsWith(`${userId}/`)) {
      return {
        status: 403,
        jsonBody: { error: 'Forbidden: You can only delete your own photos' },
      };
    }

    const photoContainer = await getPhotoContainer();

    // Check if blob exists
    const blobClient = photoContainer.getBlobClient(blobName);
    const exists = await blobClient.exists();

    if (!exists) {
      return {
        status: 404,
        jsonBody: { error: 'Photo not found' },
      };
    }

    // Delete the blob
    await photoContainer.deleteBlob(blobName);

    return {
      status: 200,
      jsonBody: { success: true },
    };
  } catch (error) {
    context.error('Error deleting photo:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to delete photo' },
    };
  }
}

app.http('deletePhoto', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'photos/{photoId}',
  handler: deletePhoto,
});
