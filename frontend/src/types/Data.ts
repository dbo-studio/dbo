export type MappedType =
  | 'string'
  | 'boolean'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'enum'
  | 'json'
  | 'uuid'
  | 'binary'
  | 'geometry'
  | 'unknown';

export type BinaryCellValue = {
  __dbo: 'binary';
  length: number;
  base64?: string;
};

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
  mappedType: MappedType;
  editable?: boolean;
  isActive: boolean;
  isPrimaryKey: boolean;
  isForeignKey?: boolean;
  enumValues?: string[];
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
