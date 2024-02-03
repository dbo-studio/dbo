import { tools } from '@/src/core/utils';

export const transformTableData = (data: any) => {
  return tools.cleanObject({
    columns: data?.column_data
  });
};
