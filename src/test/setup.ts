import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables before tests run
beforeAll(() => {
  import.meta.env.VITE_API_URL = '/api';
  import.meta.env.VITE_API_KEY = 'test-api-key';
});
