import type { Routine, Exercise } from './types';
import { api } from './api';

// DB wrapper that uses the API instead of IndexedDB
class PumpDB {
  private _userId: string | null = null;

  setUserId(userId: string) {
    this._userId = userId;
    api.setUserId(userId);
  }

  get userId(): string {
    if (!this._userId) {
      throw new Error('User ID not set');
    }
    return this._userId;
  }

  get routines() {
    return {
      toArray: async (): Promise<Routine[]> => {
        return await api.getRoutines();
      },
      
      where: (field: string) => ({
        between: (start: string, end: string) => ({
          toArray: async (): Promise<Routine[]> => {
            if (field !== 'date') {
              throw new Error('Only date filtering is supported');
            }
            return await api.getRoutines(start, end);
          }
        }),
        equals: (value: any) => ({
          toArray: async (): Promise<Routine[]> => {
            const allRoutines = await api.getRoutines();
            return allRoutines.filter((r: any) => r[field] === value);
          },
          sortBy: async (sortField: string): Promise<Routine[]> => {
            const filtered = await api.getRoutines();
            return filtered
              .filter((r: any) => r[field] === value)
              .sort((a: any, b: any) => {
                if (a[sortField] < b[sortField]) return -1;
                if (a[sortField] > b[sortField]) return 1;
                return 0;
              });
          }
        })
      }),

      add: async (routine: Omit<Routine, 'id'>): Promise<number> => {
        const created = await api.createRoutine(routine);
        return created.id!;
      },

      get: async (id: number): Promise<Routine | undefined> => {
        const routine = await api.getRoutine(id);
        return routine || undefined;
      },

      update: async (id: number, updates: Partial<Routine>): Promise<void> => {
        await api.updateRoutine(id, updates);
      },

      delete: async (id: number): Promise<void> => {
        await api.deleteRoutine(id);
      }
    };
  }

  get exercises() {
    return {
      toArray: async (): Promise<Exercise[]> => {
        return await api.getExercises();
      },

      where: (field: string) => ({
        equals: (value: any) => ({
          toArray: async (): Promise<Exercise[]> => {
            if (field === 'routineId') {
              return await api.getExercises(value);
            }
            const allExercises = await api.getExercises();
            return allExercises.filter((e: any) => e[field] === value);
          },
          sortBy: async (sortField: string): Promise<Exercise[]> => {
            const exercises = field === 'routineId' 
              ? await api.getExercises(value)
              : await api.getExercises();
            return exercises
              .filter((e: any) => e[field] === value)
              .sort((a: any, b: any) => {
                if (a[sortField] < b[sortField]) return -1;
                if (a[sortField] > b[sortField]) return 1;
                return 0;
              });
          }
        })
      }),

      add: async (exercise: Omit<Exercise, 'id'>): Promise<number> => {
        const created = await api.createExercise(exercise);
        return created.id!;
      },

      get: async (id: number): Promise<Exercise | undefined> => {
        const exercises = await api.getExercises();
        return exercises.find(e => e.id === id);
      },

      update: async (id: number, updates: Partial<Exercise>): Promise<void> => {
        await api.updateExercise(id, updates);
      },

      delete: async (id: number): Promise<void> => {
        await api.deleteExercise(id);
      },

      bulkDelete: async (ids: number[]): Promise<void> => {
        await Promise.all(ids.map(id => api.deleteExercise(id)));
      }
    };
  }
}

export const db = new PumpDB();
