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

export interface SavedExercise {
  id?: number;
  name: string;
  repetitions: number;
  weight: number;
  sets: number;
  time: string;
  distance: number;
  lastUsed: number; // timestamp
}

// Export data types
export interface ExportExercise {
  name: string;
  repetitions: number;
  weight: number;
  sets: number;
  setsCompleted: number;
  time: string;
  distance: number;
  order: number;
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
