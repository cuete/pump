import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Routine, Exercise } from '../types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment
vi.stubEnv('VITE_API_URL', '/api');
vi.stubEnv('VITE_API_KEY', 'test-api-key');

// Import after env is mocked
const { api } = await import('../api');

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    api.setUserId('test-user');
  });

  describe('Routines', () => {
    it('should get routines with userId', async () => {
      const mockRoutines = [
        { id: '1', userId: 'test-user', date: '2026-03-06', name: 'Routine 1', order: 1 },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRoutines,
      });

      const result = await api.getRoutines();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/routines?userId=test-user',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1'); // Should remain as string
    });

    it('should create routine with POST', async () => {
      const newRoutine = { date: '2026-03-06', name: 'Test', order: 1 } as Omit<Routine, 'id'>;
      const mockResponse = { ...newRoutine, id: '123', userId: 'test-user' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createRoutine(newRoutine);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/routines?userId=test-user',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ...newRoutine, userId: 'test-user' }),
        })
      );
      expect(result.id).toBe('123'); // Should remain as string
    });

    it('should delete routine with DELETE', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.deleteRoutine('123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/routines/123?userId=test-user',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(api.getRoutines()).rejects.toThrow('Unauthorized');
    });
  });

  describe('Exercises', () => {
    it('should get exercises with routineId filter', async () => {
      const mockExercises = [
        {
          id: '1',
          routineId: '10',
          userId: 'test-user',
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExercises,
      });

      const result = await api.getExercises('10');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/exercises?userId=test-user&routineId=10',
        expect.anything()
      );
      expect(result[0].routineId).toBe('10'); // Should remain as string
    });

    it('should create exercise with POST', async () => {
      const newExercise = {
        routineId: '10',
        name: 'Test',
        repetitions: 10,
        weight: 50,
        sets: 3,
        setsCompleted: 0,
        time: '00:00',
        distance: 0,
        order: 1,
      } as Omit<Exercise, 'id'>;
      
      const mockResponse = { ...newExercise, id: '456', routineId: '10', userId: 'test-user' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createExercise(newExercise);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/exercises?userId=test-user',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"routineId":"10"'), // Should be stringified
        })
      );
      expect(result.id).toBe('456'); // Should remain as string
      expect(result.routineId).toBe('10'); // Should remain as string
    });
  });
});
