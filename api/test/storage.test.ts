import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as storage from '../storage';

// Mock TableClient
const mockCreateEntity = vi.fn();
const mockGetEntity = vi.fn();
const mockUpdateEntity = vi.fn();
const mockDeleteEntity = vi.fn();
const mockListEntities = vi.fn();
const mockCreateTable = vi.fn();

vi.mock('@azure/data-tables', () => ({
  TableClient: {
    fromConnectionString: vi.fn(() => ({
      createEntity: mockCreateEntity,
      getEntity: mockGetEntity,
      updateEntity: mockUpdateEntity,
      deleteEntity: mockDeleteEntity,
      listEntities: mockListEntities,
      createTable: mockCreateTable,
    })),
  },
  odata: vi.fn(),
}));

describe('Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTable.mockResolvedValue({});
    
    // Default mock for listEntities (empty result)
    mockListEntities.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {},
    });
    
    // Mock environment
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net';
  });

  describe('Routines', () => {
    it('should create routine with auto-generated ID', async () => {
      mockCreateEntity.mockResolvedValueOnce({});

      const routine = await storage.createRoutine({
        userId: 'user-1',
        date: '2026-03-06',
        name: 'Test Routine',
        order: 1,
      });

      expect(mockCreateEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          partitionKey: 'user-1',
          rowKey: expect.any(String),
          date: '2026-03-06',
          name: 'Test Routine',
          order: 1,
        })
      );
      expect(routine.id).toBeDefined();
    });

    it('should get routines for user', async () => {
      const mockEntities = [
        {
          partitionKey: 'user-1',
          rowKey: '123',
          date: '2026-03-06',
          name: 'Routine 1',
          order: 1,
        },
      ];

      mockListEntities.mockReturnValueOnce({
        [Symbol.asyncIterator]: async function* () {
          for (const entity of mockEntities) {
            yield entity;
          }
        },
      });

      const routines = await storage.getRoutines('user-1');

      expect(mockListEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          queryOptions: expect.objectContaining({
            filter: "PartitionKey eq 'user-1'",
          }),
        })
      );
      expect(routines).toHaveLength(1);
      expect(routines[0].id).toBe('123');
    });

    it('should filter routines by date range', async () => {
      mockListEntities.mockReturnValueOnce({
        [Symbol.asyncIterator]: async function* () {},
      });

      await storage.getRoutines('user-1', '2026-03-01', '2026-03-31');

      expect(mockListEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          queryOptions: expect.objectContaining({
            filter: expect.stringContaining("date ge '2026-03-01' and date le '2026-03-31'"),
          }),
        })
      );
    });

    it('should delete routine', async () => {
      mockDeleteEntity.mockResolvedValueOnce({});
      mockListEntities.mockReturnValueOnce({
        [Symbol.asyncIterator]: async function* () {},
      });

      await storage.deleteRoutine('user-1', '123');

      expect(mockDeleteEntity).toHaveBeenCalledWith('user-1', '123');
    });

    it('should return null when routine not found', async () => {
      mockGetEntity.mockRejectedValueOnce({ statusCode: 404 });

      const result = await storage.getRoutine('user-1', '999');

      expect(result).toBeNull();
    });
  });

  describe('Exercises', () => {
    it('should create exercise with auto-generated ID', async () => {
      mockCreateEntity.mockResolvedValueOnce({});

      const exercise = await storage.createExercise({
        userId: 'user-1',
        routineId: '10',
        name: 'Bench Press',
        repetitions: 10,
        weight: 135,
        sets: 3,
        setsCompleted: 0,
        time: '00:00',
        distance: 0,
        order: 1,
      });

      expect(mockCreateEntity).toHaveBeenCalled();
      expect(exercise.id).toBeDefined();
    });

    it('should filter exercises by routineId', async () => {
      mockListEntities.mockReturnValueOnce({
        [Symbol.asyncIterator]: async function* () {},
      });

      await storage.getExercises('user-1', '10');

      expect(mockListEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          queryOptions: expect.objectContaining({
            filter: expect.stringContaining("routineId eq '10'"),
          }),
        })
      );
    });

    it('should update exercise', async () => {
      mockUpdateEntity.mockResolvedValueOnce({});

      await storage.updateExercise('user-1', '123', {
        weight: 150,
        setsCompleted: 2,
      });

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          partitionKey: 'user-1',
          rowKey: '123',
          weight: 150,
          setsCompleted: 2,
        }),
        'Merge'
      );
    });
  });

  describe('Table Initialization', () => {
    it.skip('should create tables if they do not exist (integration test)', async () => {
      // This requires a fresh module import which is complex with vi.mock
      // Run integration tests against Azurite instead
    });

    it.skip('should ignore 409 error when table already exists (integration test)', async () => {
      // This requires a fresh module import which is complex with vi.mock
      // Run integration tests against Azurite instead
    });

    it.skip('should throw error when AZURE_STORAGE_CONNECTION_STRING not set (integration test)', async () => {
      // This requires module state reset between tests
      // Run integration tests against Azurite instead
    });
  });
});
