import locales from '@/locales';
import { Button, MenuItem, Select, Typography } from '@mui/material';
import type { JSX } from 'react';
import type { RowFieldProps } from '../../types';
import {
  RowFieldInputStyled,
  RowFieldLabelRowStyled,
  RowFieldMetaStyled,
  RowFieldStyled
} from '../RowEditSheet.styled';

export default function RowField({ column, value, editable, onChange }: RowFieldProps): JSX.Element {
  const readOnly = !editable || column.editable === false;
  const isNull = value === null;
  const inputId = `row-field-${column.name}`;

  return (
    <RowFieldStyled>
      <RowFieldLabelRowStyled>
        <Typography component='label' htmlFor={inputId} variant='caption' color='textSubdued'>
          {column.name}
          <RowFieldMetaStyled>
            {' · '}
            {column.type}
            {column.isPrimaryKey ? ' · PK' : ''}
          </RowFieldMetaStyled>
        </Typography>
        {!readOnly && !column.notNull && (
          <Button size='small' onClick={(): void => onChange(isNull ? '' : null)}>
            {isNull ? locales.mobile_set_value : locales.mobile_set_null}
          </Button>
        )}
      </RowFieldLabelRowStyled>
      {column.enumValues?.length && !isNull ? (
        <Select
          id={inputId}
          fullWidth
          size='small'
          value={value ?? ''}
          disabled={readOnly}
          onChange={(event): void => onChange(String(event.target.value))}
        >
          {column.enumValues.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      ) : (
        <RowFieldInputStyled
          id={inputId}
          fullWidth
          multiline
          maxRows={6}
          readOnly={readOnly || isNull}
          muted={readOnly || isNull}
          value={isNull ? 'NULL' : value}
          onChange={(event): void => onChange(event.target.value)}
          inputProps={{ 'data-testid': `mobile-row-field-${column.name}` }}
        />
      )}
    </RowFieldStyled>
  );
}
