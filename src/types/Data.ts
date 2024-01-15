export type RowType = any;
export type ColumnType = {
  key: string;
  name: string;
  renderEditCell: any;
  resizable: boolean;
  type: string;
  isActive: boolean;
};

export type StructureType = {
  name: string;
  type: string;
  notNull: boolean;
  length: number;
  decimal: number;
  default: string;
};
