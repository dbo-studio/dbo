import locales from '@/src/locales';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { ColumnType } from '@/src/types/Data';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { v4 as uuid } from 'uuid';
import { DBStructureStyled } from './DBStructure.styled';
import DBStructureItem from './DBStructureItem';

export default function DBStructure() {
  const { getColumns } = useDataStore();

  return (
    <DBStructureStyled>
      <TableContainer component={Box}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell align='left'>{locales.name}</TableCell>
              <TableCell align='left'>{locales.type}</TableCell>
              <TableCell align='left'>{locales.default}</TableCell>
              <TableCell align='left'>{locales.length}</TableCell>
              <TableCell align='left'>{locales.decimal}</TableCell>
              <TableCell align='left'>{locales.not_null}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getColumns().map((item: ColumnType) => (
              <DBStructureItem key={uuid()} item={item} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </DBStructureStyled>
  );
}
