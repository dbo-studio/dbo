export type RowType = any;

export interface ColumnType {
  key: string;
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
  editMode?: {
    name?: boolean;
    default?: boolean;
    length?: boolean;
    comment?: boolean;
  };
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
