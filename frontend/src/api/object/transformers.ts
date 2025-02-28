import type { TreeResponseType } from './types';

export const transformTree = (data: any): TreeResponseType => {
  const objects: TreeResponseType = data;

  if (!objects.children) {
    objects.children = [];
  }

  return objects;
};
