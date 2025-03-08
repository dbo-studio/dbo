export const CREATE_DATABASE = () => '/databases';
export const DATABASE_META_DATA = (connectionID: string | number) => `/databases/metadata?connectionId=${connectionID}`;
export const DELETE_DATABASE = () => '/databases';
