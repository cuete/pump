const API_BASE = '/api';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error');
  }
}

// ==================== ROUTINES ====================

export interface RoutineResponse {
  id: string;
  date: string;
  name: string;
  order: number;
}

export async function fetchRoutines(date: string): Promise<RoutineResponse[]> {
  return apiFetch<RoutineResponse[]>(`/routines?date=${encodeURIComponent(date)}`);
}

export async function createRoutine(data: { date: string; name: string; order: number }): Promise<RoutineResponse> {
  return apiFetch<RoutineResponse>(`/routines`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRoutine(routineId: string, data: { name: string }): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/routines/${routineId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteRoutine(routineId: string): Promise<{ success: boolean; deletedExercises: number }> {
  return apiFetch<{ success: boolean; deletedExercises: number }>(`/routines/${routineId}`, {
    method: 'DELETE',
  });
}

// ==================== EXERCISES ====================

export interface ExerciseResponse {
  id: string;
  routineId: string;
  name: string;
  repetitions: number;
  weight: number;
  sets: number;
  setsCompleted: number;
  time: string;
  distance: number;
  order: number;
}

export async function fetchExercises(routineId: string): Promise<ExerciseResponse[]> {
  return apiFetch<ExerciseResponse[]>(`/exercises?routineId=${encodeURIComponent(routineId)}`);
}

export async function createExercise(data: {
  routineId: string;
  name: string;
  repetitions?: number;
  weight?: number;
  sets?: number;
  setsCompleted?: number;
  time?: string;
  distance?: number;
  order: number;
}): Promise<ExerciseResponse> {
  return apiFetch<ExerciseResponse>(`/exercises`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateExercise(
  exerciseId: string,
  data: {
    name?: string;
    repetitions?: number;
    weight?: number;
    sets?: number;
    setsCompleted?: number;
    time?: string;
    distance?: number;
    order?: number;
  }
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/exercises/${exerciseId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteExercise(exerciseId: string): Promise<{ success: boolean; photosDeleted: number }> {
  return apiFetch<{ success: boolean; photosDeleted: number }>(`/exercises/${exerciseId}`, {
    method: 'DELETE',
  });
}

// ==================== PHOTOS ====================

export interface PhotoResponse {
  id: string;
  url: string;
  timestamp: number;
}

export interface PhotosResponse {
  count: number;
  photos: PhotoResponse[];
}

export async function fetchPhotos(exerciseId: string): Promise<PhotosResponse> {
  return apiFetch<PhotosResponse>(`/photos?exerciseId=${encodeURIComponent(exerciseId)}`);
}

export async function uploadPhoto(exerciseId: string, photoBlob: Blob): Promise<{ id: string; timestamp: number; success: boolean }> {
  const formData = new FormData();
  formData.append('exerciseId', exerciseId);
  formData.append('photo', photoBlob, 'photo.jpg');

  const response = await fetch(`${API_BASE}/photos`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

export async function deletePhoto(photoId: string): Promise<{ success: boolean }> {
  // photoId is the blob name (userId/exerciseId/timestamp.jpg), needs to be URL encoded
  return apiFetch<{ success: boolean }>(`/photos/${encodeURIComponent(photoId)}`, {
    method: 'DELETE',
  });
}
