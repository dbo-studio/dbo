import { Checkbox, TableCell, Typography } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

import FieldInput from '@/src/components/base/FieldInput/FieldInput';
import SelectInput from '@/src/components/base/SelectInput/SelectInput';
import SelectOption from '@/src/components/base/SelectInput/SelectOption';
import { PgsqlTypes } from '@/src/core/constants';
import { clone } from 'lodash';
import { useState } from 'react';
import { ColumnItemStyled } from './Columns.styled';
import { ColumnItemProps } from './types';

export default function ColumnItem({ column, onChange, onSelect, edited, deleted, unsaved }: ColumnItemProps) {
  const [value, setValue] = useState(column);

  const toggleEdit = (name: 'name' | 'default' | 'length' | 'comment') => {
    const newColumn = clone(column);
    newColumn.editMode[name] = !column.editMode[name];
    onChange(column, newColumn);
  };

  const handleOnColumnChange = (value: any, name: 'name' | 'default' | 'length' | 'comment' | 'type') => {
    const newColumn = clone(column);
    newColumn[name] = value;
    setValue(newColumn);
  };

  return (
    <ColumnItemStyled
      onBlur={() => onChange(column, value)}
      edited={+edited}
      deleted={+deleted}
      unsaved={+unsaved}
      selected={column.selected ?? false}
    >
      <TableCell style={{ minWidth: 'unset' }} component='th' scope='row'>
        <Checkbox onChange={() => onSelect()} name='selected' checked={column.selected} size='small' />
      </TableCell>
      <TableCell component='th' scope='row'>
        {column.editMode.name ? (
          <FieldInput
            onChange={(e) => handleOnColumnChange(e.target.value, 'name')}
            sx={{ marginBottom: '0' }}
            name='name'
            size='small'
            value={value.name}
            type='string'
          />
        ) : (
          <Typography onDoubleClick={() => toggleEdit('name')} variant='body2'>
            {value.name}
          </Typography>
        )}
      </TableCell>
      <TableCell align='left'>
        <SelectInput
          value={value.type}
          defaultValue={value.type}
          onChange={(e) => handleOnColumnChange(e.target.value, 'type')}
          name='type'
          size='small'
        >
          {PgsqlTypes.map((t: string) => (
            <SelectOption value={t} key={uuidv4()}>
              {t}
            </SelectOption>
          ))}
        </SelectInput>
      </TableCell>
      <TableCell align='left'>
        {column.editMode.length ? (
          <FieldInput
            onChange={(e) => handleOnColumnChange(e.target.value, 'length')}
            name='length'
            value={value.length}
            size='small'
            type='string'
          />
        ) : (
          <Typography onClick={() => toggleEdit('length')} variant='body2'>
            {value.length}
          </Typography>
        )}
      </TableCell>
      <TableCell align='left'>
        {column.editMode.default ? (
          <FieldInput name='default' value={value.default} size='small' type='string' />
        ) : (
          <Typography onClick={() => toggleEdit('default')} variant='body2'>
            {value.default}
          </Typography>
        )}
      </TableCell>
      <TableCell align='left'>
        <Checkbox name='not_null' checked={value.notNull} size='small' />
      </TableCell>
      <TableCell align='left'>
        {column.editMode.comment ? (
          <FieldInput name='comment' value={value.comment} size='small' type='string' />
        ) : (
          <Typography onClick={() => toggleEdit('comment')} variant='body2'>
            {value.comment}
          </Typography>
        )}
      </TableCell>
    </ColumnItemStyled>
  );
}
