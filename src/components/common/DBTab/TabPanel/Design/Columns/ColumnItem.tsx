import { ColumnType } from '@/src/types/Data';
import { Checkbox, TableCell, TableRow } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

import FieldInput from '@/src/components/base/FieldInput/FieldInput';
import SelectInput from '@/src/components/base/SelectInput/SelectInput';
import SelectOption from '@/src/components/base/SelectInput/SelectOption';
import { PgsqlTypes } from '@/src/core/constants';

export default function ColumnItem({ item }: { item: ColumnType }) {
  return (
    <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
      <TableCell component='th' scope='row'>
        <FieldInput name='name' size='small' value={item.name} type='string' />
      </TableCell>
      <TableCell align='left'>
        <SelectInput name='type' size='small'>
          {PgsqlTypes.map((t: string) => (
            <SelectOption value={t} key={uuidv4()}>
              {t}
            </SelectOption>
          ))}
        </SelectInput>
      </TableCell>
      <TableCell align='left'>
        <FieldInput name='default' value={item.default} size='small' type='string' />
      </TableCell>
      <TableCell align='left'>
        <FieldInput name='length' value={item.length} size='small' type='string' />
      </TableCell>
      <TableCell align='left'>
        <Checkbox name='not_null' checked={item.notNull} size='small' />
      </TableCell>
      <TableCell align='left'>
        <FieldInput name='comment' value={item.comment} size='small' type='string' />
      </TableCell>
    </TableRow>
  );
}
