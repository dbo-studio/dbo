import { GET_TREE } from '@/api/object/endpoints.ts';
import api from '@/core/services/api';
import { transformTree } from './transformers';
import type { TreeRequestType, TreeResponseType } from '@/api/object/types.ts';

export const getTree = async ({ connectionId, parentId }: TreeRequestType): Promise<TreeResponseType> => {
  return api
    .get(GET_TREE(), {
      connectionId,
      parentId
    })
    .then(transformTree);
};
