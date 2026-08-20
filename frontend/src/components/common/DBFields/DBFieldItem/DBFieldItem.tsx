import DateTimePicker from '@/components/base/DateTimePicker/DateTimePicker';
import { isDateTimePickerMode } from '@/components/base/DateTimePicker/temporalDraft';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import GridCheckbox from '@/components/common/DataGrid/GridCheckbox';
import { useCellEditing } from '@/components/common/DataGrid/hooks/useCellEditing';
import { nextBooleanCellValue, parseBooleanCellValue } from '@/core/utils/dataGrid';
import { EventFor } from '@/types';
import { Box, MenuItem, TextField, Typography } from '@mui/material';
import { JSX, useState } from 'react';
import { DBFieldItemProps } from '../types';

export function DBFieldItem({ row, column }: DBFieldItemProps): JSX.Element {
  const cellValue = row[column.name];
  const [value, setValue] = useState<string | number>(
    cellValue == null || cellValue === undefined ? '' : (cellValue as string | number)
  );
  const [prevRowValue, setPrevRowValue] = useState(cellValue);

  if (cellValue !== prevRowValue) {
    setPrevRowValue(cellValue);
    setValue(cellValue == null || cellValue === undefined ? '' : (cellValue as string | number));
  }

  const { handleRowChange, commitValue } = useCellEditing(row, column.name);

  const handleChange = (e: EventFor<'input', 'onChange'>): void => {
    setValue(e.target.value);
  };

  const handleBlur = (e: EventFor<'input', 'onBlur'>): void => {
    setValue(e.target.value);
    handleRowChange(e);
  };

  if (column.mappedType === 'boolean') {
    const boolState = parseBooleanCellValue(cellValue);
    return (
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant='caption'>{column.name}</Typography>
          <Typography variant='caption'>{column.type}</Typography>
        </Box>
        <GridCheckbox
          checked={boolState === true}
          indeterminate={boolState === null}
          aria-label={column.name}
          aria-checked={boolState === null ? 'mixed' : boolState === true}
          onChange={(): void => {
            commitValue(nextBooleanCellValue(cellValue));
          }}
        />
      </Box>
    );
  }

  if (column.mappedType === 'enum' && column.enumValues && column.enumValues.length > 0) {
    return (
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant='caption'>{column.name}</Typography>
          <Typography variant='caption'>{column.type}</Typography>
        </Box>
        <TextField
          select
          size='small'
          fullWidth
          value={
            cellValue == null
              ? ''
              : typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean'
                ? String(cellValue)
                : ''
          }
          onChange={(e): void => {
            const next = e.target.value === '' ? null : e.target.value;
            setValue(next ?? '');
            commitValue(next);
          }}
        >
          {!column.notNull && <MenuItem value=''>NULL</MenuItem>}
          {column.enumValues.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    );
  }

  if (isDateTimePickerMode(column.mappedType)) {
    return (
      <DateTimePicker
        variant='field'
        mode={column.mappedType}
        size='small'
        label={column.name}
        typelabel={column.type}
        value={row[column.name]}
        onCommit={(next): void => {
          setValue(next);
          commitValue(next);
        }}
      />
    );
  }

  return (
    <FieldInput
      size='small'
      value={String(value)}
      fullWidth={true}
      label={column.name}
      typelabel={column.type}
      type='text'
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
