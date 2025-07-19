import { Grid } from '@mui/material';
import type { JSX } from 'react';
import type { FormFieldsProps } from '../types';
import SimpleField from './SimpleField';

export default function FormFields({ fields, onChange }: FormFieldsProps): JSX.Element {
  return (
    <Grid direction={'row'} mt={1}>
      {fields.map((field) => (
        <Grid
          size={{
            xs: 12,
            md: 12,
            lg: field.type === 'query' ? 12 : 6
          }}
          key={field.id}
        >
          <SimpleField field={field} onChange={(value): void => onChange(field.id, value)} />
        </Grid>
      ))}
    </Grid>
  );
}
