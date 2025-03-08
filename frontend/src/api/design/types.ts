export type UpdateDesignType = {
  connectionId: number;
  nodeId: string;
  edited: UpdateDesignItemType[];
  removed: string[];
  added: UpdateDesignItemType[];
};

export type UpdateDesignItemType = {
  name?: string;
  type?: string;
  length?: number;
  default?: {
    makeNull: boolean;
    makeEmpty: boolean;
    value: string;
  };
  isNull?: true;
  comment?: string;
  rename?: string;
};
