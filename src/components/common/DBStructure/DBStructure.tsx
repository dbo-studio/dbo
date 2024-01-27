import { useUUID } from '@/src/hooks';
import { StructureType } from '@/src/types/Data';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { DBStructureStyled } from './DBStructure.styled';
import DBStructureItem from './DBStructureItem';
import { fakeColumn } from './makeData';

export default function DBStructure() {
  const data = fakeColumn;
  const uuids = useUUID(data.length);

  return (
    <DBStructureStyled>
      <TableContainer component={Box}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell align='left'>Name</TableCell>
              <TableCell align='left'>Type</TableCell>
              <TableCell align='left'>Length</TableCell>
              <TableCell align='left'>Decimal</TableCell>
              <TableCell align='left'>Not Null</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item: StructureType, index: number) => (
              <DBStructureItem key={uuids[index]} item={item} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </DBStructureStyled>
  );
}
