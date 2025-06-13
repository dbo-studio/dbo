export type RowType = {
  dbo_index: number;
  [key: string]: any;
};

export interface ColumnType {
  name: string;
  type: string;
  isActive: boolean;
  notNull: boolean;
  length: string;
  comment: string;
  default: string;
  mappedType: string;
  selected?: boolean;
  editable?: boolean;
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
