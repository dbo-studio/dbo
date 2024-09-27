import api from '@/core/services/api';
import { UPDATE_DESIGN } from './endpoints';
import type { UpdateDesignType } from './types';

export const updateDesign = (data: UpdateDesignType) => {
  return api.patch(UPDATE_DESIGN(), data);
};
