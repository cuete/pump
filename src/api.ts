import type { Routine, Exercise } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

interface ApiRoutine {
  id?: string;
  userId: string;
  date: string;
  name: string;
  order: number;
}

interface ApiExercise {
  id?: string;
  routineId: string;
  userId: string;
  name: string;
  repetitions: number;
  weight: number;
  sets: number;
  setsCompleted: number;
  time: string;
  distance: number;
  order: number;
}

class ApiClient {
  private userId: string = '';

  setUserId(userId: string) {
    this.userId = userId;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Routines
  async getRoutines(startDate?: string, endDate?: string): Promise<Routine[]> {
    const params = new URLSearchParams({ userId: this.userId });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    
    const routines = await this.request<ApiRoutine[]>(`/routines?${params}`);
    return routines.map(r => ({ ...r, id: r.id! }));
  }

  async getRoutine(id: string): Promise<Routine | null> {
    try {
      const params = new URLSearchParams({ userId: this.userId });
      const routine = await this.request<ApiRoutine>(`/routines/${id}?${params}`);
      return { ...routine, id: routine.id! };
    } catch (error) {
      return null;
    }
  }

  async createRoutine(routine: Omit<Routine, 'id'>): Promise<Routine> {
    const params = new URLSearchParams({ userId: this.userId });
    const created = await this.request<ApiRoutine>(`/routines?${params}`, {
      method: 'POST',
      body: JSON.stringify({ ...routine, userId: this.userId }),
    });
    return { ...created, id: created.id! };
  }

  async updateRoutine(id: string, updates: Partial<Routine>): Promise<void> {
    const params = new URLSearchParams({ userId: this.userId });
    await this.request(`/routines/${id}?${params}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteRoutine(id: string): Promise<void> {
    const params = new URLSearchParams({ userId: this.userId });
    await this.request(`/routines/${id}?${params}`, {
      method: 'DELETE',
    });
  }

  // Exercises
  async getExercises(routineId?: string): Promise<Exercise[]> {
    const params = new URLSearchParams({ userId: this.userId });
    if (routineId !== undefined) params.set('routineId', routineId);
    
    const exercises = await this.request<ApiExercise[]>(`/exercises?${params}`);
    return exercises.map(e => ({ 
      ...e, 
      id: e.id!,
      routineId: e.routineId
    }));
  }

  async createExercise(exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
    const params = new URLSearchParams({ userId: this.userId });
    const created = await this.request<ApiExercise>(`/exercises?${params}`, {
      method: 'POST',
      body: JSON.stringify({ 
        ...exercise, 
        routineId: exercise.routineId,
        userId: this.userId 
      }),
    });
    return { 
      ...created, 
      id: created.id!,
      routineId: created.routineId
    };
  }

  async updateExercise(id: string, updates: Partial<Exercise>): Promise<void> {
    const params = new URLSearchParams({ userId: this.userId });
    await this.request(`/exercises/${id}?${params}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteExercise(id: string): Promise<void> {
    const params = new URLSearchParams({ userId: this.userId });
    await this.request(`/exercises/${id}?${params}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
