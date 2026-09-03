/** Reads the default database from connection form options, if present. */
export const connectionDatabase = (connection: { options?: object } | undefined): string | undefined => {
  const options = connection?.options;
  if (options && 'database' in options && typeof options.database === 'string' && options.database) {
    return options.database;
  }
  return undefined;
};
