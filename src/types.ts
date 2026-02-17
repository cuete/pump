export interface Routine {
  id?: number;
  date: string; // YYYY-MM-DD
  name: string;
  order: number;
}

export interface Exercise {
  id?: number;
  routineId: number;
  name: string;
  repetitions: number;
  weight: number;
  sets: number;
  setsCompleted: number;
  time: string; // mm:ss
  distance: number; // miles
  order: number;
}

export interface ExercisePhoto {
  id?: number;
  exerciseId: number;
  blob: Blob;
  timestamp: number;
}

// Export data types
export interface ExportPhoto {
  timestamp: number;
  base64: string;
  mimeType: string;
}

export interface ExportExercise {
  name: string;
  repetitions: number;
  weight: number;
  sets: number;
  setsCompleted: number;
  time: string;
  distance: number;
  order: number;
  photos: ExportPhoto[];
}

export interface ExportRoutine {
  date: string; // YYYY-MM-DD
  name: string;
  order: number;
  exercises: ExportExercise[];
}

export interface ExportData {
  version: number;
  exportDate: string; // YYYY-MM-DD
  routines: ExportRoutine[];
}
