import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { Exercise } from '../types';

export function useExercises(routineId: number | undefined) {
  const [exercises, setExercises] = useState<Exercise[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!routineId) {
      setExercises([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await db.exercises.where('routineId').equals(routineId).sortBy('order');
      setExercises(data);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setLoading(false);
    }
  }, [routineId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { exercises, loading, refresh };
}
