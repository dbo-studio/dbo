import api from '@/src/core/services/api';
import { UPDATE_DESIGN } from './endpoints';
import { UpdateDesignType } from './types';

export const updateDesign = (data: UpdateDesignType) => {
  const formattedData: {
    connection_id: number;
    table: string;
    schema: string;
    database: string;
    edited: object[];
    deleted: object[];
    added: object[];
  } = {
    connection_id: data.connection_id,
    table: data.table,
    schema: data.schema,
    database: data.database,
    edited: [],
    // deleted: data.removed,
    added: data.added
  };

  // data.edited.forEach((edited: EditedRow) => {
  //   formattedData.edited.push({
  //     conditions: edited.conditions,
  //     values: edited.new
  //   });
  // });

  return api.post(UPDATE_DESIGN(), formattedData);
};
