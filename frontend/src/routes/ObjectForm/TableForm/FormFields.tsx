import { Grid } from '@mui/material';
import type { JSX } from 'react';
import { memo, useMemo } from 'react';
import { useDynamicFields } from '../hooks/useDynamicFields';
import type { FormFieldsProps } from '../types';
import SimpleField from './SimpleField';

function FormFields({ fields, onChange }: FormFieldsProps): JSX.Element {
  // Build form values from fields
  const formValues = useMemo(() => {
    const values: Record<string, any> = {};
    fields.forEach((field) => {
      values[field.id] = field.value;
    });
    return values;
  }, [fields]);

  const { getDynamicOptions, isLoadingDynamicField } = useDynamicFields(fields, formValues);

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
          <SimpleField
            field={field}
            onChange={(value): void => onChange(field.id, value)}
            dynamicOptions={field.dependsOn ? getDynamicOptions(field.id) : undefined}
            isLoadingDynamic={field.dependsOn ? isLoadingDynamicField(field.id) : false}
          />
        </Grid>
      ))}
    </Grid>
  );
}

export default memo(FormFields);
