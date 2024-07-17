export type AutoCompleteType = {
  databases: string[];
  views: string[];
  schemas: string[];
  tables: string[];
  columns: {
    [key: string]: string[];
  };
};
