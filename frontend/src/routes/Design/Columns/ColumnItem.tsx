import { Checkbox, TableCell, Typography } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import SelectOption from '@/components/base/SelectInput/SelectOption';
import { PgsqlTypes } from '@/core/constants';
import { clone } from 'lodash';
import { useState } from 'react';
import { ColumnItemStyled } from './Columns.styled';
import { ColumnItemProps } from './types';

export default function ColumnItem({
  column,
  onChange,
  onSelect,
  onEditToggle,
  edited,
  deleted,
  unsaved
}: ColumnItemProps) {
  const [value, setValue] = useState(column);

  const handleToggleEdit = (name: 'name' | 'default' | 'length' | 'comment') => {
    if (column['editMode']) {
      column.editMode[name] = !column.editMode[name];
    } else {
      column['editMode']![name] = true;
    }
    onEditToggle(column);
  };

  const handleOnColumnChange = (value: any, name: 'name' | 'default' | 'length' | 'comment' | 'type' | 'notNull') => {
    const newColumn = clone(column);

    if (name == 'notNull') {
      newColumn[name] = value == 'true' ? false : true;
    } else {
      newColumn[name] = value;
    }
    setValue(newColumn);
  };

  const handleOnBlur = () => {
    if (!unsaved) {
      value.editMode = undefined;
      column.editMode = undefined;
    }

    onChange(
      {
        ...column,
        editable: undefined
      },
      {
        ...value,
        editable: undefined
      }
    );
  };

  return (
    <ColumnItemStyled
      onBlur={handleOnBlur}
      edited={+edited}
      deleted={+deleted}
      unsaved={+unsaved}
      selected={column.selected ?? false}
    >
      <TableCell style={{ minWidth: 'unset' }} component='th' scope='row'>
        <Checkbox
          sx={{ marginBottom: '0' }}
          onChange={() => onSelect()}
          name='selected'
          checked={column.selected}
          size='small'
        />
      </TableCell>
      <TableCell component='th' scope='row'>
        {column?.editMode?.name ? (
          <FieldInput
            onChange={(e) => handleOnColumnChange(e.target.value, 'name')}
            margin='none'
            name='name'
            size='small'
            value={value.name}
            type='string'
          />
        ) : (
          <Typography onDoubleClick={() => handleToggleEdit('name')} variant='body2'>
            {value.name}
          </Typography>
        )}
      </TableCell>
      <TableCell align='left'>
        <SelectInput
          sx={{ marginBottom: '0' }}
          value={value.type}
          defaultValue={value.type}
          onChange={(e) => handleOnColumnChange(e.target.value, 'type')}
          name='type'
          size='small'
          margin='none'
        >
          {PgsqlTypes.map((t: string) => (
            <SelectOption value={t} key={uuidv4()}>
              {t}
            </SelectOption>
          ))}
        </SelectInput>
      </TableCell>
      <TableCell align='left'>
        {column?.editMode?.length ? (
          <FieldInput
            margin='none'
            onChange={(e) => handleOnColumnChange(e.target.value, 'length')}
            name='length'
            value={value.length}
            size='small'
            type='number'
          />
        ) : (
          <Typography onClick={() => handleToggleEdit('length')} variant='body2'>
            {value.length}
          </Typography>
        )}
      </TableCell>
      <TableCell align='left'>
        {column?.editMode?.default ? (
          <FieldInput
            onChange={(e) => handleOnColumnChange(e.target.value, 'default')}
            margin='none'
            name='default'
            value={value.default}
            size='small'
            type='string'
          />
        ) : (
          <Typography onClick={() => handleToggleEdit('default')} variant='body2'>
            {value.default}
          </Typography>
        )}
      </TableCell>
      <TableCell align='left'>
        <Checkbox
          onChange={(e) => handleOnColumnChange(e.target.value, 'notNull')}
          sx={{ marginBottom: '0' }}
          name='notNull'
          checked={value.notNull}
          value={value.notNull}
          size='small'
        />
      </TableCell>
      <TableCell align='left'>
        {column?.editMode?.comment ? (
          <FieldInput
            onChange={(e) => handleOnColumnChange(e.target.value, 'comment')}
            margin='none'
            name='comment'
            value={value.comment}
            size='small'
            type='string'
          />
        ) : (
          <Typography onClick={() => handleToggleEdit('comment')} variant='body2'>
            {value.comment}
          </Typography>
        )}
      </TableCell>
    </ColumnItemStyled>
  );
}
