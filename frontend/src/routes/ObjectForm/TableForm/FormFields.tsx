import { Grid2 } from '@mui/material';
import type { FormFieldsProps } from '../types';
import SimpleField from './SimpleField';

export default function FormFields({ fields, onChange }: FormFieldsProps) {
  return (
    <Grid2 direction={'row'} mt={1}>
      {fields.map((field) => (
        <Grid2
          size={{
            xs: 12,
            md: 12,
            lg: 6
          }}
          key={field.id}
        >
          <SimpleField field={field} onChange={(value) => onChange(field.id, value)} />
        </Grid2>
      ))}
    </Grid2>
  );
}
