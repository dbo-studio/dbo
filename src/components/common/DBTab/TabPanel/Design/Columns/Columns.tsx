import locales from '@/src/locales';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { ColumnType } from '@/src/types/Data';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { v4 as uuid } from 'uuid';
import ColumnItem from './ColumnItem';
import { ColumnsStyled } from './Columns.styled';

export default function Columns() {
  const { getColumns } = useDataStore();

  return (
    <ColumnsStyled>
      <TableContainer component={Box}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell align='left'>{locales.name}</TableCell>
              <TableCell align='left'>{locales.type}</TableCell>
              <TableCell align='left'>{locales.default}</TableCell>
              <TableCell align='left'>{locales.length}</TableCell>
              <TableCell align='left'>{locales.not_null}</TableCell>
              <TableCell align='left'>{locales.comment}</TableCell>
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
  );
}
