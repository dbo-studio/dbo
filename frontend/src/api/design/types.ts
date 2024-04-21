export type UpdateDesignType = {
  connection_id: number;
  schema: string;
  database: string;
  table: string;
  edited: UpdateDesignItemType[];
  removed: string[];
  added: UpdateDesignItemType[];
};

export type UpdateDesignItemType = {
  name?: string;
  type?: string;
  length?: number;
  default?: {
    make_null: boolean;
    make_empty: boolean;
    value: string;
  };
  is_null?: true;
  comment?: string;
  rename?: string;
};
