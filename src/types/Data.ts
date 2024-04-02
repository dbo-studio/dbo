import { Column } from 'react-data-grid';

export type RowType = any;

export interface ColumnType extends Column<RowType> {
  key: string;
  name: string;
  renderEditCell: any;
  resizable: boolean;
  type: string;
  isActive: boolean;
  notNull: boolean;
  length: string;
  comment: string;
  default: string;
  mappedType: string;
  selected?: boolean;
  editMode: {
    name: boolean;
    default: boolean;
    length: boolean;
    comment: boolean;
  };
}

export interface EditedColumnType extends ColumnType {
  old?: object;
  new?: object;
  edited?: boolean;
  deleted?: boolean;
  unsaved?: boolean;
}
