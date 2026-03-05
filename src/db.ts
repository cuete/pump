import Dexie, { type Table } from 'dexie';
import type { Routine, Exercise, ExercisePhoto, SavedExercise } from './types';

class PumpDB extends Dexie {
  routines!: Table<Routine, number>;
  exercises!: Table<Exercise, number>;
  exercisePhotos!: Table<ExercisePhoto, number>;
  savedExercises!: Table<SavedExercise, number>;

  constructor() {
    super('PumpDB');
    this.version(1).stores({
      routines: '++id, date',
      exercises: '++id, routineId',
      exercisePhotos: '++id, exerciseId',
    });
    this.version(2).stores({
      routines: '++id, date',
      exercises: '++id, routineId',
      exercisePhotos: '++id, exerciseId',
    }).upgrade(tx => {
      return tx.table('exercises').toCollection().modify(ex => {
        if (ex.time === undefined) ex.time = '00:00';
      });
    });
    this.version(3).stores({
      routines: '++id, date',
      exercises: '++id, routineId',
      exercisePhotos: '++id, exerciseId',
    }).upgrade(tx => {
      return tx.table('exercises').toCollection().modify(ex => {
        if (ex.setsCompleted === undefined) ex.setsCompleted = 0;
      });
    });
    this.version(4).stores({
      routines: '++id, date',
      exercises: '++id, routineId',
      exercisePhotos: '++id, exerciseId',
    }).upgrade(tx => {
      return tx.table('exercises').toCollection().modify(ex => {
        if (ex.distance === undefined) ex.distance = 0;
      });
    });
    this.version(5).stores({
      routines: '++id, date',
      exercises: '++id, routineId',
      exercisePhotos: '++id, exerciseId',
      savedExercises: '++id, &name, lastUsed',
    });
  }
}

export const db = new PumpDB();
