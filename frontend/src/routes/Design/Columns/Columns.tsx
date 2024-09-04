import { TabMode } from '@/core/enums';
import { useCurrentTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { ColumnType, EditedColumnType } from '@/types/Data';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import ColumnItem from './ColumnItem';
import { ColumnsStyled } from './Columns.styled';

export default function Columns() {
  const { getColumns, getEditedColumns, updateColumn, addEditedColumns, runQuery } = useDataStore();
  const currentTab = useCurrentTab();

  const getData = async () => {
    await runQuery();
  };

  useEffect(() => {
    if (currentTab?.mode == TabMode.Design && getColumns().length == 0) {
      getData();
    }
  }, [currentTab]);

  const handleColumnChange = (oldValue: ColumnType, newValue: EditedColumnType) => {
    addEditedColumns(oldValue, newValue);
    updateColumn(newValue);
  };

  const handleColumnSelect = (column: ColumnType) => {
    updateColumn({
      ...column,
      selected: !column.selected
    });
  };

  const handleToggleEditColumn = (column: ColumnType) => {
    updateColumn(column);
  };

  return (
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
  );
}
