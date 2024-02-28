import { RunQueryResponseType } from './types';

export const transformRunQuery = (data: any): RunQueryResponseType => {
  return {
    query: data?.query,
    data: data?.data,
    structures: data?.structures
  };
};
