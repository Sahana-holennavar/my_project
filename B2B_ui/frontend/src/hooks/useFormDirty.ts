import { useMemo } from 'react';

interface UseFormDirtyReturn<T> {
  isDirty: boolean;
  changedFields: (keyof T)[];
}

export function useFormDirty<T extends Record<string, unknown>>(
  currentValues: T,
  initialValues: T
): UseFormDirtyReturn<T> {
  const { isDirty, changedFields } = useMemo(() => {
    const changed: (keyof T)[] = [];
    let hasChanges = false;

    for (const key in currentValues) {
      if (Object.prototype.hasOwnProperty.call(currentValues, key)) {
        const current = currentValues[key];
        const initial = initialValues[key];

        if (JSON.stringify(current) !== JSON.stringify(initial)) {
          changed.push(key);
          hasChanges = true;
        }
      }
    }

    return {
      isDirty: hasChanges,
      changedFields: changed,
    };
  }, [currentValues, initialValues]);

  return { isDirty, changedFields };
}

