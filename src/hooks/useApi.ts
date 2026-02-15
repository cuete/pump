import useSWR, { mutate } from 'swr';
import * as api from '../api/client';

// ==================== ROUTINES ====================

export function useRoutines(date: string) {
  const key = `/routines?date=${date}`;
  const { data, error, isLoading } = useSWR(
    key,
    () => api.fetchRoutines(date),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    routines: data,
    isLoading,
    error,
    mutate: () => mutate(key),
  };
}

export function useCreateRoutine() {
  return async (data: { date: string; name: string; order: number }) => {
    const result = await api.createRoutine(data);
    // Invalidate the routines cache for this date
    await mutate(`/routines?date=${data.date}`);
    return result;
  };
}

export function useUpdateRoutine() {
  return async (routineId: string, data: { name: string }, date: string) => {
    const result = await api.updateRoutine(routineId, data);
    // Invalidate the routines cache for this date
    await mutate(`/routines?date=${date}`);
    return result;
  };
}

export function useDeleteRoutine() {
  return async (routineId: string, date: string) => {
    const result = await api.deleteRoutine(routineId);
    // Invalidate both routines and exercises caches
    await mutate(`/routines?date=${date}`);
    await mutate((key) => typeof key === 'string' && key.startsWith('/exercises?routineId='), undefined, { revalidate: true });
    return result;
  };
}

// ==================== EXERCISES ====================

export function useExercises(routineId: string | null) {
  const key = routineId ? `/exercises?routineId=${routineId}` : null;
  const { data, error, isLoading } = useSWR(
    key,
    () => (routineId ? api.fetchExercises(routineId) : null),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    exercises: data,
    isLoading,
    error,
    mutate: () => key && mutate(key),
  };
}

export function useCreateExercise() {
  return async (data: {
    routineId: string;
    name: string;
    repetitions?: number;
    weight?: number;
    sets?: number;
    setsCompleted?: number;
    time?: string;
    distance?: number;
    order: number;
  }) => {
    const result = await api.createExercise(data);
    // Invalidate the exercises cache for this routine
    await mutate(`/exercises?routineId=${data.routineId}`);
    return result;
  };
}

export function useUpdateExercise() {
  return async (
    exerciseId: string,
    routineId: string,
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
  ) => {
    const result = await api.updateExercise(exerciseId, data);
    // Invalidate the exercises cache for this routine
    await mutate(`/exercises?routineId=${routineId}`);
    return result;
  };
}

export function useDeleteExercise() {
  return async (exerciseId: string, routineId: string) => {
    const result = await api.deleteExercise(exerciseId);
    // Invalidate both exercises and photos caches
    await mutate(`/exercises?routineId=${routineId}`);
    await mutate(`/photos?exerciseId=${exerciseId}`);
    return result;
  };
}

// ==================== PHOTOS ====================

export function usePhotos(exerciseId: string | null) {
  const key = exerciseId ? `/photos?exerciseId=${exerciseId}` : null;
  const { data, error, isLoading } = useSWR(
    key,
    () => (exerciseId ? api.fetchPhotos(exerciseId) : null),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    photos: data?.photos || [],
    photoCount: data?.count || 0,
    isLoading,
    error,
    mutate: () => key && mutate(key),
  };
}

export function useUploadPhoto() {
  return async (exerciseId: string, photoBlob: Blob) => {
    const result = await api.uploadPhoto(exerciseId, photoBlob);
    // Invalidate the photos cache for this exercise
    await mutate(`/photos?exerciseId=${exerciseId}`);
    return result;
  };
}

export function useDeletePhoto() {
  return async (photoId: string, exerciseId: string) => {
    const result = await api.deletePhoto(photoId);
    // Invalidate the photos cache for this exercise
    await mutate(`/photos?exerciseId=${exerciseId}`);
    return result;
  };
}
