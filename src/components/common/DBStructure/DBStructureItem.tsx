import { ColumnType } from '@/src/types/Data';
import { Checkbox, TableCell, TableRow } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import FieldInput from '../../base/FieldInput/FieldInput';
import SelectInput from '../../base/SelectInput/SelectInput';
import SelectOption from '../../base/SelectInput/SelectOption';
import { fakeStructureTypes } from './makeData';

export default function DBStructureItem({ item }: { item: ColumnType }) {
  const types = fakeStructureTypes();

  return (
    <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
      <TableCell component='th' scope='row'>
        <FieldInput size='small' value={item.name} type='string' />
      </TableCell>
      <TableCell align='left'>
        <SelectInput size='small'>
          {types.map((t: string) => (
            <SelectOption value={t} key={uuidv4()}>
              {t}
            </SelectOption>
          ))}
        </SelectInput>
      </TableCell>
      <TableCell align='left'>
        <FieldInput value={item.default} size='small' type='string' />
      </TableCell>
      <TableCell align='left'>
        <FieldInput value={item.length} size='small' type='string' />
      </TableCell>
      <TableCell align='left'>
        <Checkbox checked={item.notNull} size='small' />
      </TableCell>
      <TableCell align='left'>
        <FieldInput value={item.comment} size='small' type='string' />
      </TableCell>
    </TableRow>
  );
}
