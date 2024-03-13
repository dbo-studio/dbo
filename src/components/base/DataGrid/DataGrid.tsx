import { handelRowChangeLog } from '@/src/core/utils';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { Checkbox } from '@mui/material';
import { default as Grid, RenderCheckboxProps, RowsChangeData } from 'react-data-grid';
import './styles.css';
import { DataGridProps } from './types';

export default function DataGrid(props: DataGridProps) {
  const { getEditedRows, getUnsavedRows, getRemovedRows } = useDataStore();

  const handleOnCellClick = (e: any) => {
    if (e.rowIdx == -1) {
      return;
    }
    props.onSelectedCellChange(e.row);
  };

  const handleRowsChange = (rows: any[], data: RowsChangeData<any, unknown>) => {
    const oldRow = getRows()[data.indexes[0]];
    const newRow = rows[data.indexes[0]];
    props.onRowsChange(old,new)
    
    
    const editedRows = handelRowChangeLog(getEditedRows(), oldRow, newRow);
    updateEditedRows(editedRows);
    updateRows(rows);
  };

  return (
    <Grid
      rowHeight={30}
      onSelectedCellChange={handleOnCellClick}
      rowKeyGetter={rowKeyGetter}
      selectedRows={props.selectedRows}
      onSelectedRowsChange={props.onSelectedRowsChange}
      columns={props.columns}
      rows={props.rows}
      onRowsChange={props.onRowsChange}
      headerRowHeight={30}
      renderers={{ renderCheckbox }}
      rowClass={(_, index) => {
        if (getRemovedRows().some((v) => v.dbo_index == index) == true) {
          return 'removed-highlight';
        }
        if (getUnsavedRows().some((v) => v.dbo_index == index) == true) {
          return 'unsaved-highlight';
        }
        if (getEditedRows().some((v) => v.dboIndex == index) == true) {
          return 'edit-highlight';
        }
        return undefined;
      }}
    />
  );
}

function rowKeyGetter(row: any) {
  return row.dbo_index;
}

function renderCheckbox({ onChange, ...props }: RenderCheckboxProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.checked, (e.nativeEvent as MouseEvent).shiftKey);
  }

  return <Checkbox size='small' style={{ padding: 0 }} {...props} onChange={handleChange} />;
}
