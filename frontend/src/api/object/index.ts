import { GET_TREE } from '@/api/object/endpoints.ts';
import api from '@/core/services/api';
import { transformTree } from './transformers';
import type { TreeRequestType, TreeResponseType } from '@/api/object/types.ts';

export const getTree = async ({ connection_id, parent_id }: TreeRequestType): Promise<TreeResponseType> => {
  return api
    .get(GET_TREE(), {
      connection_id,
      parent_id
    })
    .then(transformTree);
};
