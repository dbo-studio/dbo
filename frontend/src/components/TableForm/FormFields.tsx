import type { FormFieldType } from '@/api/tree/types';
import { Grid2 } from '@mui/material';
import SimpleField from './SimpleField';

interface FormFieldsProps {
  fields: FormFieldType[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
}

export default function FormFields({ fields, values, onChange }: FormFieldsProps) {
  return (
    <Grid2 direction={'row'}>
      {fields.map((field) => (
        <Grid2
          size={{
            xs: 12,
            md: 6
          }}
          key={field.id}
        >
          <SimpleField field={field} value={values[field.id]} onChange={(value) => onChange(field.id, value)} />
        </Grid2>
      ))}
    </Grid2>
  );
}
