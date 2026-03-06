import { db } from '../db';
import type { ExportData, ExportRoutine, ExportExercise } from '../types';

const EXPORT_VERSION = 1;

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
  const routines = await db.routines.toArray();
  const sortedRoutines = routines.sort((a, b) => a.date.localeCompare(b.date));
  const exportRoutines: ExportRoutine[] = [];

  for (const routine of sortedRoutines) {
    const exercises = await db.exercises
      .where('routineId')
      .equals(routine.id!)
      .sortBy('order');

    const exportExercises: ExportExercise[] = exercises.map(exercise => ({
      name: exercise.name,
      repetitions: exercise.repetitions,
      weight: exercise.weight,
      sets: exercise.sets,
      setsCompleted: exercise.setsCompleted,
      time: exercise.time,
      distance: exercise.distance,
      order: exercise.order,
    }));

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

  // Import data
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
      await db.exercises.add({
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
    }
  }
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
  await db.exercises.toArray().then(exercises => 
    Promise.all(exercises.map(e => db.exercises.delete(e.id!)))
  );
  await db.routines.toArray().then(routines => 
    Promise.all(routines.map(r => db.routines.delete(r.id!)))
  );
}
