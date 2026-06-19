import CreatableSelectInput from '@/components/base/CreatableSelectInput/CreatableSelectInput';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor';
import { variables } from '@/core/theme/variables';
import { FormFieldOptionType, FormFieldType, FormValue } from '@/types/Tree';
import { Box, Checkbox, Stack, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

export default function SimpleField({
  field,
  onChange,
  dynamicOptions,
  isArrayForm,
  isLoadingDynamic
}: {
  field: FormFieldType;
  onChange: (value: FormValue | FormValue[]) => void;
  dynamicOptions?: FormFieldOptionType[];
  isLoadingDynamic?: boolean;
  isArrayForm?: boolean;
}): React.JSX.Element {
  const [localValue, setLocalValue] = useState<FormValue | FormValue[]>(field.value);

  const handleSelectChange = (value: SelectInputOption | SelectInputOption[] | null): void => {
    if (field.type === 'multi-select') {
      const multiValue = Array.isArray(value) ? value.map((item) => item.value) : [];
      onChange(multiValue as FormValue[]);
    } else {
      const singleValue = value && !Array.isArray(value) ? value.value : '';
      onChange(singleValue as FormValue);
    }
  };

  useEffect(() => {
    if (field.value !== localValue) {
      setLocalValue(field.value);
    }
  }, [field]);

  const fieldOptions = dynamicOptions || field.options || [];

  switch (field.type) {
    case 'text':
      return (
        <Stack direction={'row'} alignItems={'center'}>
          <FieldInput
            size={isArrayForm ? 'small' : 'medium'}
            value={localValue || ''}
            onChange={(e): void => setLocalValue(e.target.value)}
            onBlur={(): void => onChange(localValue)}
            fullWidth
            required={field.required}
            margin={'none'}
            label={isArrayForm ? undefined : field.name}
          />
        </Stack>
      );

    case 'checkbox':
      return (
        <Box display='flex' alignItems='center'>
          <Checkbox
            size={'small'}
            checked={(localValue as boolean) || false}
            onChange={(e): void => setLocalValue(e.target.checked)}
            onBlur={(): void => onChange(localValue)}
          />
          <Typography variant='caption' color='textText'>
            {field.name}
          </Typography>
        </Box>
      );

    case 'select':
    case 'multi-select':
      return (
        <Box>
          <CreatableSelectInput
            isLoading={isLoadingDynamic}
            isMulti={field.type === 'multi-select'}
            label={isArrayForm ? undefined : field.name}
            value={localValue as string | string[] | null}
            size={isArrayForm ? 'small' : 'medium'}
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
          {!isArrayForm && (
            <Typography variant='caption' color='textText'>
              {field.name}
            </Typography>
          )}
          <Box
            display='flex'
            width='100%'
            minHeight={250}
            border={1}
            borderColor='divider'
            borderRadius={variables.radius.medium}
          >
            <SqlEditor
              value={(localValue as string) ?? ''}
              onChange={(value): void => setLocalValue(value)}
              onBlur={(value): void => onChange(value)}
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
