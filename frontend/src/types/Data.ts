export type RowType = {
  dbo_index: number;
  [key: string]: unknown;
};

export interface ColumnType {
  name: string;
  type: string;
  notNull: boolean;
  length: string;
  default: string;
  comment: string;
  mappedType: string;
  editable?: boolean;
  isActive: boolean;
  isPrimaryKey: boolean;
  sourceTable?: string;
  sourceColumn?: string;
  selected?: boolean;
}

export interface EditedColumnType extends ColumnType {
  old?: EditedColumnValue;
  new?: EditedColumnValue;
  edited?: boolean;
  deleted?: boolean;
  unsaved?: boolean;
}

export type EditedColumnValue = {
  type?: string;
  name?: string;
  notNull?: boolean;
  length?: string;
  default?: string;
  comment?: string;
};
