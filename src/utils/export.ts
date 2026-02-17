import { db } from '../db';
import type { ExportData, ExportRoutine, ExportExercise, ExportPhoto } from '../types';

const EXPORT_VERSION = 1;

/**
 * Convert a Blob to base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: mimeType });
}

/**
 * Get local date string in YYYY-MM-DD format
 */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Export all database data to JSON
 */
export async function exportDatabase(): Promise<ExportData> {
  const routines = await db.routines.orderBy('date').toArray();
  const exportRoutines: ExportRoutine[] = [];

  for (const routine of routines) {
    const exercises = await db.exercises
      .where('routineId')
      .equals(routine.id!)
      .sortBy('order');

    const exportExercises: ExportExercise[] = [];

    for (const exercise of exercises) {
      const photos = await db.exercisePhotos
        .where('exerciseId')
        .equals(exercise.id!)
        .toArray();

      const exportPhotos: ExportPhoto[] = [];

      for (const photo of photos) {
        const base64 = await blobToBase64(photo.blob);
        exportPhotos.push({
          timestamp: photo.timestamp,
          base64,
          mimeType: photo.blob.type,
        });
      }

      exportExercises.push({
        name: exercise.name,
        repetitions: exercise.repetitions,
        weight: exercise.weight,
        sets: exercise.sets,
        setsCompleted: exercise.setsCompleted,
        time: exercise.time,
        distance: exercise.distance,
        order: exercise.order,
        photos: exportPhotos,
      });
    }

    exportRoutines.push({
      date: routine.date,
      name: routine.name,
      order: routine.order,
      exercises: exportExercises,
    });
  }

  return {
    version: EXPORT_VERSION,
    exportDate: toLocalDateStr(new Date()),
    routines: exportRoutines,
  };
}

/**
 * Import database data from JSON
 */
export async function importDatabase(data: ExportData): Promise<void> {
  // Validate version
  if (data.version !== EXPORT_VERSION) {
    throw new Error(`Unsupported export version: ${data.version}. Expected version ${EXPORT_VERSION}.`);
  }

  // Validate structure
  if (!data.routines || !Array.isArray(data.routines)) {
    throw new Error('Invalid export data: missing or invalid routines array.');
  }

  if (!isValidDate(data.exportDate)) {
    throw new Error('Invalid export data: invalid export date format.');
  }

  // Validate all dates
  for (const routine of data.routines) {
    if (!isValidDate(routine.date)) {
      throw new Error(`Invalid date format in routine: ${routine.date}`);
    }
  }

  // Import data in a transaction
  await db.transaction('rw', db.routines, db.exercises, db.exercisePhotos, async () => {
    for (const routineData of data.routines) {
      // Get the maximum order for this date to avoid conflicts
      const existingRoutines = await db.routines.where('date').equals(routineData.date).toArray();
      const maxOrder = existingRoutines.length > 0
        ? Math.max(...existingRoutines.map(r => r.order))
        : 0;

      // Insert routine
      const routineId = await db.routines.add({
        date: routineData.date,
        name: routineData.name,
        order: maxOrder + 1,
      });

      // Insert exercises
      for (const exerciseData of routineData.exercises) {
        const exerciseId = await db.exercises.add({
          routineId: routineId as number,
          name: exerciseData.name,
          repetitions: exerciseData.repetitions,
          weight: exerciseData.weight,
          sets: exerciseData.sets,
          setsCompleted: exerciseData.setsCompleted,
          time: exerciseData.time,
          distance: exerciseData.distance,
          order: exerciseData.order,
        });

        // Insert photos
        for (const photoData of exerciseData.photos) {
          const blob = base64ToBlob(photoData.base64, photoData.mimeType);
          await db.exercisePhotos.add({
            exerciseId: exerciseId as number,
            blob,
            timestamp: photoData.timestamp,
          });
        }
      }
    }
  });
}

/**
 * Download JSON data as a file
 */
export function downloadJSON(data: ExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `pump-backup-${data.exportDate}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Clear all data from the database
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.routines, db.exercises, db.exercisePhotos, async () => {
    await db.exercisePhotos.clear();
    await db.exercises.clear();
    await db.routines.clear();
  });
}
