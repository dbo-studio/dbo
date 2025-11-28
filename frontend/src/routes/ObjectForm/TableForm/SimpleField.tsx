import type { FormFieldOption, FormFieldType } from '@/api/tree/types';
import CreatableSelectInput from '@/components/base/CreatableSelectInput/CreatableSelectInput';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor';
import { variables } from '@/core/theme/variables';
import { Box, Checkbox, Typography } from '@mui/material';
import type { JSX } from 'react';
import type { SimpleFieldProps } from '../types';

export default function SimpleField({
  field,
  onChange,
  size = 'medium',
  dynamicOptions
}: SimpleFieldProps): JSX.Element {
  const handleChangeSelect = (value: SelectInputOption): void => {
    if (field.type === 'multi-select') {
      onChange(value ? value?.map((item: any) => item.value) : []);
    } else {
      onChange(value ? value.value : '');
    }
  };

  // Use dynamicOptions if available, otherwise use metadata.options (new) or field.fields (legacy)
  const fieldOptions = dynamicOptions || field.metadata?.options || field.fields;

  switch (field.type) {
    case 'text':
      return (
        <FieldInput
          margin={size === 'small' ? 'none' : undefined}
          label={size === 'medium' ? field.name : undefined}
          value={field.value || ''}
          onChange={(e): void => onChange(e.target.value)}
          size={size}
          fullWidth
        />
      );
    case 'checkbox':
      return (
        <Box display='flex' alignItems='center'>
          <Checkbox checked={field.value || false} onChange={(e): void => onChange(e.target.checked)} size={size} />
          {size === 'medium' && <Typography>{field.name}</Typography>}
        </Box>
      );
    case 'select':
    case 'multi-select':
      return (
        <Box mb={size === 'small' ? 0 : 1}>
          <CreatableSelectInput
            isMulti={field.type === 'multi-select'}
            label={size === 'medium' ? field.name : undefined}
            value={field.value || (field.type === 'multi-select' ? [] : '')}
            options={
              fieldOptions?.map((opt: FormFieldOption | FormFieldType) => {
                // Handle FormFieldOption (from metadata.options or dynamicOptions)
                if ('value' in opt && 'label' in opt && !('type' in opt)) {
                  return { value: opt.value, label: opt.label };
                }
                // Handle legacy format (FormFieldType with type 'option' in fields)
                return {
                  value: (opt as FormFieldType).value ?? (opt as FormFieldType).id,
                  label: (opt as FormFieldType).name ?? ''
                };
              }) || []
            }
            onChange={handleChangeSelect}
            size={size}
          />
        </Box>
      );
    case 'query':
      return (
        <Box>
          {size === 'medium' && (
            <Typography variant='caption' color='textText'>
              {field.name}
            </Typography>
          )}
          <Box display={'flex'} width={'100%'} minHeight={250} flex={1}>
            <Box
              display={'flex'}
              p={0.1}
              flex={1}
              border={1}
              borderColor={'divider'}
              borderRadius={variables.radius.medium}
            >
              <SqlEditor
                value={field.value ?? ''}
                onChange={(value): void => onChange(value)}
                autocomplete={{
                  databases: [],
                  views: [],
                  schemas: [],
                  tables: [],
                  columns: {}
                }}
                onRunQuery={(query): void => {
                  console.debug('🚀 ~ SimpleField ~ query:', query);
                }}
              />
            </Box>
          </Box>
        </Box>
      );
    default:
      return <></>;
  }
}
