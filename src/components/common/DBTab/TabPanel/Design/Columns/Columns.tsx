import locales from '@/src/locales';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { ColumnType, EditedColumnType } from '@/src/types/Data';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { v4 as uuid } from 'uuid';
import ColumnItem from './ColumnItem';
import { ColumnsStyled } from './Columns.styled';

export default function Columns() {
  const { getColumns, getEditedColumns, updateColumn, updateEditedColumns } = useDataStore();
  const { selectedTab } = useTabStore();

  const handleColumnChange = (oldValue: ColumnType, newValue: EditedColumnType) => {
    updateEditedColumns(oldValue, newValue);
    updateColumn(newValue);
  };

  const handleColumnSelect = (column: ColumnType) => {
    column.selected = !column.selected;
    updateColumn(column);
  };

  const handleToggleEditColumn = (column: ColumnType) => {
    updateColumn(column);
  };

  return (
    selectedTab && (
      <ColumnsStyled>
        <TableContainer component={Box}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell align='justify'></TableCell>
                <TableCell align='justify'>{locales.name}</TableCell>
                <TableCell align='justify'>{locales.type}</TableCell>
                <TableCell align='justify'>{locales.length}</TableCell>
                <TableCell align='justify'>{locales.default}</TableCell>
                <TableCell align='justify'>{locales.not_null}</TableCell>
                <TableCell align='justify'>{locales.comment}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getColumns().map((item: ColumnType) => (
                <ColumnItem
                  key={uuid()}
                  edited={getEditedColumns().some((c) => c.key == item.key && c.edited) == true}
                  deleted={getEditedColumns().some((c) => c.key == item.key && c.deleted) == true}
                  unsaved={getEditedColumns().some((c) => c.key == item.key && c.unsaved) == true}
                  column={item}
                  onChange={handleColumnChange}
                  onSelect={() => handleColumnSelect(item)}
                  onEditToggle={handleToggleEditColumn}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ColumnsStyled>
    )
  );
}
