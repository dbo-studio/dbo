import CreatableSelectInput from '@/components/base/CreatableSelectInput/CreatableSelectInput';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor';
import { variables } from '@/core/theme/variables';
import { Box, Checkbox, Typography } from '@mui/material';
import React from 'react';
import type { SimpleFieldProps } from '../../types';

export default function SimpleField({ field, onChange, dynamicOptions }: SimpleFieldProps): React.JSX.Element {
  const handleSelectChange = (value: SelectInputOption | SelectInputOption[] | null): void => {
    if (field.type === 'multi-select') {
      const multiValue = Array.isArray(value) ? value.map((item) => item.value) : [];
      onChange(multiValue);
    } else {
      const singleValue = value && !Array.isArray(value) ? value.value : '';
      onChange(singleValue);
    }
  };

  const fieldOptions = dynamicOptions || field.options || [];

  switch (field.type) {
    case 'text':
      return (
        <FieldInput
          label={field.name}
          value={(field.value as string) || ''}
          onChange={(e): void => onChange(e.target.value)}
          fullWidth
          required={field.required}
        />
      );

    case 'checkbox':
      return (
        <Box display='flex' alignItems='center'>
          <Checkbox checked={(field.value as boolean) || false} onChange={(e): void => onChange(e.target.checked)} />
          <Typography>{field.name}</Typography>
        </Box>
      );

    case 'select':
    case 'multi-select':
      return (
        <Box mb={1}>
          <CreatableSelectInput
            isMulti={field.type === 'multi-select'}
            label={field.name}
            value={field.value}
            options={fieldOptions.map((opt) => ({
              value: opt.value,
              label: opt.label
            }))}
            onChange={handleSelectChange}
          />
        </Box>
      );

    case 'query':
      return (
        <Box>
          <Typography variant='caption' color='text.secondary' mb={1} display='block'>
            {field.name}
          </Typography>
          <Box
            display='flex'
            width='100%'
            minHeight={250}
            border={1}
            borderColor='divider'
            borderRadius={variables.radius.medium}
          >
            <SqlEditor
              value={(field.value as string) ?? ''}
              onChange={(value): void => onChange(value)}
              autocomplete={{
                databases: [],
                views: [],
                schemas: [],
                tables: [],
                columns: {}
              }}
              onRunQuery={(query): void => {
                console.debug('Query executed:', query);
              }}
            />
          </Box>
        </Box>
      );

    default:
      return <></>;
  }
}
