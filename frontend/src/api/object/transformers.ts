import type { TreeResponseType } from './types';

export const transformTree = (data: any): TreeResponseType => {
  return {
    id: data?.id,
    name: data?.name,
    type: data?.type,
    action: data?.action,
    contextMenu: data?.contextMenu ?? [],
    children: data?.children ?? []
  };
};
