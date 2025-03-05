import type { AutoCompleteType, ColumnType } from '@/types';
import type { RunQueryResponseType } from './types';

export const transformRunQuery = (data: any): RunQueryResponseType => {
  return {
    query: data?.query,
    data: data?.data,
    structures: transformStructures(data?.columns ?? [])
  };
};

export const transformStructures = (data: any): ColumnType[] => {
  const structures: ColumnType[] = [];
  for (const item of data) {
    structures.push({
      key: item?.name,
      name: item?.name,
      type: item?.type,
      notNull: item?.not_null,
      length: item?.length,
      default: item?.default,
      mappedType: item?.mapped_type,
      comment: item?.comment,
      editable: item?.editable ?? false,
      isActive: item?.is_active ?? true
    });
  }

  return structures;
};

export const transformAutoComplete = (data: any): AutoCompleteType => {
  return {
    databases: data?.databases ?? [],
    views: data?.views ?? [],
    schemas: data?.schemas ?? [],
    tables: data?.tables ?? [],
    columns: data?.columns ?? []
  };
};
