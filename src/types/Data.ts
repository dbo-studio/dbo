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
  decimal: number;
  default: string;
}
