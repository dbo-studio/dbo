import api from '@/api';
import type { DatabaseMetaDataType } from '@/api/database/types.ts';
import { TabMode } from '@/core/enums';
import useAPI from '@/hooks/useApi.hook.ts';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store.ts';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType, EditedColumnType } from '@/types/Data';
import { Box, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import ColumnItem from './ColumnItem';
import { ColumnsStyled } from './Columns.styled';

export default function Columns() {
  const [metadata, setMetadata] = useState<DatabaseMetaDataType | undefined>();
  const { getColumns, getEditedColumns, updateColumn, addEditedColumns, runQuery } = useDataStore();
  const { getSelectedTab } = useTabStore();
  const { currentConnection } = useConnectionStore();

  const { request: getDatabaseMetadata, pending } = useAPI({
    apiMethod: api.database.getDatabaseMetadata
  });

  useEffect(() => {
    if (currentConnection && !metadata) {
      getDatabaseMetadata(currentConnection?.id).then((res) => {
        setMetadata(res);
      });
    }
  }, [metadata, currentConnection]);

  useEffect(() => {
    if (getSelectedTab()?.mode === TabMode.Design && getColumns().length === 0) {
      runQuery().then();
    }
  }, [getSelectedTab()]);

  const handleColumnChange = (oldValue: ColumnType, newValue: EditedColumnType) => {
    addEditedColumns(oldValue, newValue).then();
    updateColumn(newValue).then();
  };

  const handleColumnSelect = (column: ColumnType) => {
    updateColumn({
      ...column,
      selected: !column.selected
    }).then();
  };

  const handleToggleEditColumn = (column: ColumnType) => {
    updateColumn(column).then();
  };

  return (
    <ColumnsStyled>
      {!metadata && pending ? (
        <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <TableContainer component={Box}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell align='justify' />
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
                  edited={getEditedColumns().some((c) => c.name === item.name && c.edited) === true}
                  deleted={getEditedColumns().some((c) => c.name === item.name && c.deleted) === true}
                  unsaved={getEditedColumns().some((c) => c.name === item.name && c.unsaved) === true}
                  column={item}
                  onChange={handleColumnChange}
                  onSelect={() => handleColumnSelect(item)}
                  onEditToggle={handleToggleEditColumn}
                  dataTypes={metadata?.dataTypes ?? []}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </ColumnsStyled>
  );
}
