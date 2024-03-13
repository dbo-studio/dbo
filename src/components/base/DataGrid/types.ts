export type DataGridProps = {
  onSelectedCellChange?: any;
  selectedRows?: any;
  onSelectedRowsChange?: any;
  columns?: any;
  rows?: any;
  onRowsChange?: (oldValue: any, newValue: any) => void;
};
