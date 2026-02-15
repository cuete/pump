import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getPhotoContainer, generateSasUrl } from '../lib/storage.js';

export async function getPhotos(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const exerciseId = request.query.get('exerciseId');

    if (!exerciseId) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required query parameter: exerciseId' },
      };
    }

    const photoContainer = await getPhotoContainer();
    const blobPrefix = `${userId}/${exerciseId}/`;

    // List all blobs with this prefix
    const blobs = photoContainer.listBlobsFlat({ prefix: blobPrefix });

    const photos: any[] = [];
    for await (const blob of blobs) {
      // Generate SAS token URL for read access
      const url = await generateSasUrl(blob.name, 60); // 60 minutes expiry

      // Extract timestamp from blob name (format: userId/exerciseId/timestamp.jpg)
      const parts = blob.name.split('/');
      const filename = parts[parts.length - 1];
      const timestamp = parseInt(filename.replace('.jpg', '')) || Date.now();

      photos.push({
        id: blob.name, // Use blob name as ID
        url: url,
        timestamp: timestamp,
      });
    }

    // Sort by timestamp (newest first)
    photos.sort((a, b) => b.timestamp - a.timestamp);

    return {
      status: 200,
      jsonBody: {
        count: photos.length,
        photos: photos,
      },
    };
  } catch (error) {
    context.error('Error fetching photos:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch photos' },
    };
  }
}

app.http('getPhotos', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'photos',
  handler: getPhotos,
});
