export const GET_TABLE_DATA = '/get/table';

export const GET_CONNECTION_LIST = () => `/connections`;
export const GET_CONNECTION_DETAIL = (connectionID: string | number) => `/connections/${connectionID}`;
export const CREATE_CONNECTION = () => `/connections`;
export const UPDATE_CONNECTION = (connectionID: string | number) => `/connections/${connectionID}`;
export const DELETE_CONNECTION = (connectionID: string | number) => `/connections/${connectionID}`;
export const TEST_CONNECTION = () => `/connections/test`;
