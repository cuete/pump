import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as storage from '../storage';

// Mock TableClient
const mockUpdateEntity = vi.fn();
const mockDeleteEntity = vi.fn();
const mockListEntities = vi.fn();
const mockCreateTable = vi.fn();

vi.mock('@azure/data-tables', () => ({
  TableClient: {
    fromConnectionString: vi.fn(() => ({
      updateEntity: mockUpdateEntity,
      deleteEntity: mockDeleteEntity,
      listEntities: mockListEntities,
      createTable: mockCreateTable,
    })),
  },
  odata: vi.fn(),
}));

describe('Update and Delete Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTable.mockResolvedValue({});
    mockListEntities.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {},
    });
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net';
  });

  describe('updateRoutine', () => {
    it('should update only specified fields', async () => {
      mockUpdateEntity.mockResolvedValueOnce({});

      await storage.updateRoutine('user-1', '123', {
        name: 'Updated Name',
      });

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          partitionKey: 'user-1',
          rowKey: '123',
          name: 'Updated Name',
        }),
        'Merge'
      );
      
      // Should not include userId or id in the entity
      const callArgs = mockUpdateEntity.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('id');
      expect(callArgs).not.toHaveProperty('userId');
    });

    it('should handle multiple field updates', async () => {
      mockUpdateEntity.mockResolvedValueOnce({});

      await storage.updateRoutine('user-1', '123', {
        name: 'New Name',
        order: 5,
      });

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          partitionKey: 'user-1',
          rowKey: '123',
          name: 'New Name',
          order: 5,
        }),
        'Merge'
      );
    });
  });

  describe('updateExercise', () => {
    it('should update only specified fields', async () => {
      mockUpdateEntity.mockResolvedValueOnce({});

      await storage.updateExercise('user-1', '456', {
        weight: 150,
        setsCompleted: 2,
      });

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          partitionKey: 'user-1',
          rowKey: '456',
          weight: 150,
          setsCompleted: 2,
        }),
        'Merge'
      );
      
      // Should not include userId or id in the entity
      const callArgs = mockUpdateEntity.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('id');
      expect(callArgs).not.toHaveProperty('userId');
    });
  });

  describe('deleteRoutine', () => {
    it('should delete exercises before deleting routine', async () => {
      const mockExercises = [
        { id: 'ex1', routineId: '123' },
        { id: 'ex2', routineId: '123' },
      ];

      mockListEntities.mockReturnValueOnce({
        [Symbol.asyncIterator]: async function* () {
          for (const ex of mockExercises) {
            yield {
              partitionKey: 'user-1',
              rowKey: ex.id,
              routineId: ex.routineId,
            };
          }
        },
      });

      mockDeleteEntity.mockResolvedValue({});

      await storage.deleteRoutine('user-1', '123');

      // Verify exercises deleted first
      expect(mockDeleteEntity).toHaveBeenCalledTimes(3); // 2 exercises + 1 routine
      
      // First two calls should be for exercises
      expect(mockDeleteEntity).toHaveBeenNthCalledWith(1, 'user-1', 'ex1');
      expect(mockDeleteEntity).toHaveBeenNthCalledWith(2, 'user-1', 'ex2');
      
      // Last call should be for the routine
      expect(mockDeleteEntity).toHaveBeenNthCalledWith(3, 'user-1', '123');
    });

    it('should handle routine with no exercises', async () => {
      mockListEntities.mockReturnValueOnce({
        [Symbol.asyncIterator]: async function* () {},
      });

      mockDeleteEntity.mockResolvedValueOnce({});

      await storage.deleteRoutine('user-1', '123');

      // Only routine should be deleted
      expect(mockDeleteEntity).toHaveBeenCalledTimes(1);
      expect(mockDeleteEntity).toHaveBeenCalledWith('user-1', '123');
    });
  });
});
