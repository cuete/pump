import Dexie, { type Table } from 'dexie';
import type { Routine, Exercise, ExercisePhoto } from './types';

class PumpDB extends Dexie {
  routines!: Table<Routine, number>;
  exercises!: Table<Exercise, number>;
  exercisePhotos!: Table<ExercisePhoto, number>;

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
  }
}

export const db = new PumpDB();
