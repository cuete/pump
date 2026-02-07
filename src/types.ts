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
  order: number;
}

export interface ExercisePhoto {
  id?: number;
  exerciseId: number;
  blob: Blob;
  timestamp: number;
}
