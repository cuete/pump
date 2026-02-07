import { useRef, useCallback } from 'react';

export function useAutoSave<T>(saveFn: (data: T) => Promise<void>, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallback(
    (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveFn(data);
      }, delay);
    },
    [saveFn, delay],
  );

  return save;
}
