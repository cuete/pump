import { useState } from 'react';
import { db } from '../db';

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]; // Remove data:image/jpeg;base64, prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function DataMigration() {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleMigrate() {
    try {
      setStatus('exporting');
      setMessage('Exporting data from IndexedDB...');

      // Export all data from IndexedDB
      const routines = await db.routines.toArray();
      const exercises = await db.exercises.toArray();
      const photoRecords = await db.exercisePhotos.toArray();

      setMessage(`Found ${routines.length} routines, ${exercises.length} exercises, ${photoRecords.length} photos`);

      // Convert photo blobs to base64
      const photos = await Promise.all(
        photoRecords.map(async (p) => ({
          id: p.id,
          exerciseId: p.exerciseId,
          blob: await blobToBase64(p.blob),
          timestamp: p.timestamp,
        }))
      );

      setStatus('uploading');
      setMessage('Uploading data to server...');

      // Upload to server
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routines,
          exercises,
          photos,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Migration failed');
      }

      const result = await response.json();

      setStatus('success');
      setMessage(`✓ Migration complete! ${result.routines} routines, ${result.exercises} exercises, ${result.photos} photos migrated.`);
    } catch (error) {
      setStatus('error');
      setMessage(`✗ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Migration error:', error);
    }
  }

  if (status === 'success') {
    return (
      <div className="migration-panel success">
        <h3>Migration Complete!</h3>
        <p>{message}</p>
        <p>Your data has been successfully migrated to cloud storage. You can now access your workouts from any device.</p>
        <small>Note: Your local IndexedDB data is still intact. This component will be removed in a future update.</small>
      </div>
    );
  }

  return (
    <div className="migration-panel">
      <h3>Data Migration Required</h3>
      <p>
        Your workout data is currently stored only on this device.
        Click below to migrate your data to cloud storage for access from any device.
      </p>

      {message && (
        <div className={`migration-status ${status}`}>
          {message}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleMigrate}
        disabled={status === 'exporting' || status === 'uploading'}
      >
        {status === 'exporting' ? 'Exporting...' : status === 'uploading' ? 'Uploading...' : 'Migrate Data to Cloud'}
      </button>

      {status === 'error' && (
        <button className="btn btn-small" onClick={() => setStatus('idle')}>
          Try Again
        </button>
      )}
    </div>
  );
}
