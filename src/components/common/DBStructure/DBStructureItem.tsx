import { StructureType } from '@/src/types/Data';
import { Checkbox, NativeSelect, TableCell, TableRow } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import FieldInput from '../../base/FieldInput/FieldInput';
import { fakeStructureTypes } from './makeData';

export default function DBStructureItem({ item }: { item: StructureType }) {
  const types = fakeStructureTypes();

  return (
    <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
      <TableCell component='th' scope='row'>
        <FieldInput value={item.name} type='string' />
      </TableCell>
      <TableCell align='left'>
        <NativeSelect size='small'>
          {types.map((t: string) => (
            <option key={uuidv4()}>{t}</option>
          ))}
        </NativeSelect>
      </TableCell>
      <TableCell align='left'>
        <FieldInput value={item.length} type='number' />
      </TableCell>
      <TableCell align='left'>
        <FieldInput value={item.decimal} type='number' />
      </TableCell>
      <TableCell align='left'>
        <Checkbox checked={item.notNull} size='small' />
      </TableCell>
    </TableRow>
  );
}
