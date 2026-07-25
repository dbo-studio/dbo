import { tools } from '@/core/utils';
import { useMemo } from 'react';

export const useUUID = (arraySize = 1): string[] => {
  return useMemo(() => {
    const ids: string[] = [];

    for (let i = 0; i < arraySize; i = i + 1) {
      ids.push(tools.uuid());
    }

    return ids;
  }, [arraySize]);
};
