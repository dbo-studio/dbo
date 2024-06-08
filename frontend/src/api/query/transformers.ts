import { ColumnType } from '@/src/types';
import { RunQueryResponseType } from './types';

export const transformRunQuery = (data: any): RunQueryResponseType => {
  return {
    query: data?.query,
    data: data?.data,
    structures: transformStructures(data?.structures)
  };
};

export const transformStructures = (data: any): ColumnType[] => {
  const structures: ColumnType[] = [];
  data?.forEach((item: any) => {
    structures.push({
      key: item?.name,
      name: item?.name,
      type: item?.type,
      notNull: item?.not_null,
      length: item?.length,
      default: item?.default,
      mappedType: item?.mapped_type,
      renderEditCell: undefined,
      resizable: false,
      comment: item?.comment,
      editable: item?.editable ?? false,
      isActive: item?.is_active ?? true
    });
  });

  return structures;
};
