import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserIdWithDevFallback } from '../lib/auth.js';
import { getPhotoContainer } from '../lib/storage.js';

/**
 * Parse multipart/form-data from the request
 * This is a simple parser for Azure Functions v4 which doesn't have built-in multipart support
 */
function parseMultipartFormData(body: Buffer, contentType: string): { fields: Map<string, string>, files: Map<string, Buffer> } {
  const fields = new Map<string, string>();
  const files = new Map<string, Buffer>();

  // Extract boundary from content-type header
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) {
    throw new Error('No boundary found in Content-Type');
  }

  const boundary = `--${boundaryMatch[1]}`;
  const parts = body.toString('binary').split(boundary);

  for (const part of parts) {
    if (part.trim() === '' || part.trim() === '--') continue;

    // Split headers and content
    const [headerSection, ...contentParts] = part.split('\r\n\r\n');
    if (!headerSection) continue;

    const content = contentParts.join('\r\n\r\n').trim().replace(/\r\n--$/, '');

    // Parse Content-Disposition header
    const dispositionMatch = headerSection.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/);
    if (!dispositionMatch) continue;

    const fieldName = dispositionMatch[1];
    const filename = dispositionMatch[2];

    if (filename) {
      // It's a file
      files.set(fieldName, Buffer.from(content, 'binary'));
    } else {
      // It's a text field
      fields.set(fieldName, content);
    }
  }

  return { fields, files };
}

export async function uploadPhoto(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = getUserIdWithDevFallback(request);
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return {
        status: 400,
        jsonBody: { error: 'Content-Type must be multipart/form-data' },
      };
    }

    // Get the raw body as a buffer
    const bodyBuffer = Buffer.from(await request.arrayBuffer());

    // Parse multipart form data
    const { fields, files } = parseMultipartFormData(bodyBuffer, contentType);

    const exerciseId = fields.get('exerciseId');
    const photoBuffer = files.get('photo');

    if (!exerciseId || !photoBuffer) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields: exerciseId and photo' },
      };
    }

    const photoContainer = await getPhotoContainer();
    const timestamp = Date.now();
    const blobName = `${userId}/${exerciseId}/${timestamp}.jpg`;

    // Upload the photo blob
    const blockBlobClient = photoContainer.getBlockBlobClient(blobName);
    await blockBlobClient.upload(photoBuffer, photoBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'image/jpeg',
      },
    });

    return {
      status: 201,
      jsonBody: {
        id: blobName,
        timestamp: timestamp,
        success: true,
      },
    };
  } catch (error) {
    context.error('Error uploading photo:', error);

    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return {
        status: 401,
        jsonBody: { error: error.message },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to upload photo', details: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

app.http('uploadPhoto', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'photos',
  handler: uploadPhoto,
});
