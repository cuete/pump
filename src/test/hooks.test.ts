import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRoutines } from '../hooks/useRoutines';
import { useExercises } from '../hooks/useExercises';
import { db } from '../db';

// Mock db
vi.mock('../db', () => ({
  db: {
    routines: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          sortBy: vi.fn(),
        })),
      })),
    },
    exercises: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          sortBy: vi.fn(),
        })),
      })),
    },
  },
}));

describe('useRoutines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load routines for a date', async () => {
    const mockRoutines = [
      { id: 1, date: '2026-03-06', name: 'Routine 1', order: 1 },
    ];

    vi.mocked(db.routines.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        sortBy: vi.fn().mockResolvedValue(mockRoutines),
      }),
    } as any);

    const { result } = renderHook(() => useRoutines('2026-03-06'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.routines).toEqual(mockRoutines);
    expect(db.routines.where).toHaveBeenCalledWith('date');
  });

  it('should refresh when called', async () => {
    const mockRoutines = [{ id: 1, date: '2026-03-06', name: 'Test', order: 1 }];

    vi.mocked(db.routines.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        sortBy: vi.fn().mockResolvedValue(mockRoutines),
      }),
    } as any);

    const { result } = renderHook(() => useRoutines('2026-03-06'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Trigger refresh
    await result.current.refresh();

    expect(db.routines.where).toHaveBeenCalledTimes(2);
  });
});

describe('useExercises', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load exercises for a routine', async () => {
    const mockExercises = [
      {
        id: 1,
        routineId: 10,
        name: 'Exercise 1',
        repetitions: 10,
        weight: 100,
        sets: 3,
        setsCompleted: 0,
        time: '00:00',
        distance: 0,
        order: 1,
      },
    ];

    vi.mocked(db.exercises.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        sortBy: vi.fn().mockResolvedValue(mockExercises),
      }),
    } as any);

    const { result } = renderHook(() => useExercises('10'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.exercises).toEqual(mockExercises);
    expect(db.exercises.where).toHaveBeenCalledWith('routineId');
  });

  it('should return empty array when routineId is undefined', async () => {
    const { result } = renderHook(() => useExercises(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.exercises).toEqual([]);
    expect(db.exercises.where).not.toHaveBeenCalled();
  });
});
