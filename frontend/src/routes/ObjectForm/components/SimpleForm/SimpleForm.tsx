import { Box } from '@mui/material';
import React, { memo, useMemo } from 'react';
import { useDynamicField } from '../../hooks/useDynamicField';
import type { FormValue, SimpleFormProps } from '../../types';
import SimpleField from './SimpleField';

function SimpleForm({ schema, onFieldChange }: SimpleFormProps): React.JSX.Element {
  const fieldsWithValues = useMemo(() => schema, [schema]);

  const formValues = useMemo((): Record<string, FormValue> => {
    const values: Record<string, FormValue> = {};
    fieldsWithValues.forEach((field) => {
      values[field.id] = field.value ?? null;
    });
    return values;
  }, [fieldsWithValues]);

  const { getDynamicOptions, isLoadingDynamicField } = useDynamicField(schema, formValues);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mt: 1 }}>
      {fieldsWithValues.map((field) => (
        <Box key={field.id} sx={{ gridColumn: field.type === 'query' ? '1 / -1' : 'auto' }}>
          <SimpleField
            field={field}
            onChange={(value): void => onFieldChange(field.id, value)}
            dynamicOptions={field.dependsOn ? getDynamicOptions(field.id) : undefined}
            isLoadingDynamic={field.dependsOn ? isLoadingDynamicField(field.id) : false}
          />
        </Box>
      ))}
    </Box>
  );
}

export default memo(SimpleForm);
