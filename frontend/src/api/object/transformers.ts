import type { ObjectResponseType } from './types';

export const transformObject = (data: any): ObjectResponseType[] => {
  const objects: ObjectResponseType[] = [];
  for (const item of data) {
    objects.push(item);
  }

  return objects;
};
