import locales from '@/src/locales';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { ColumnType } from '@/src/types/Data';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { v4 as uuid } from 'uuid';
import ColumnItem from './ColumnItem';
import { ColumnsStyled } from './Columns.styled';

export default function Columns() {
  const { getColumns } = useDataStore();
  const { selectedTab } = useTabStore();

  return (
    selectedTab && (
      <ColumnsStyled>
        <TableContainer component={Box}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell align='justify'>{locales.name}</TableCell>
                <TableCell align='justify'>{locales.type}</TableCell>
                <TableCell align='justify'>{locales.default}</TableCell>
                <TableCell align='justify'>{locales.length}</TableCell>
                <TableCell align='justify'>{locales.not_null}</TableCell>
                <TableCell align='justify'>{locales.comment}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getColumns().map((item: ColumnType) => (
                <ColumnItem key={uuid()} item={item} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ColumnsStyled>
    )
  );
}
