import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { Routine } from '../types';

export function useRoutines(date: string) {
  const [routines, setRoutines] = useState<Routine[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.routines.where('date').equals(date).sortBy('order');
      setRoutines(data);
    } catch (error) {
      console.error('Failed to load routines:', error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { routines, loading, refresh };
}
