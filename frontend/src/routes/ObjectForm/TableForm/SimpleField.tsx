import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor';
import { variables } from '@/core/theme/variables';
import { Box, Checkbox, Typography } from '@mui/material';
import type { SimpleFieldProps } from '../types';

export default function SimpleField({ field, onChange, size = 'medium' }: SimpleFieldProps) {
  switch (field.type) {
    case 'text':
      return (
        <FieldInput
          margin={size === 'small' ? 'none' : undefined}
          label={size === 'medium' ? field.name : undefined}
          value={field.value || ''}
          onChange={(e) => onChange(e.target.value)}
          size={size}
          fullWidth
        />
      );
    case 'checkbox':
      return (
        <Box display='flex' alignItems='center'>
          <Checkbox checked={field.value || false} onChange={(e) => onChange(e.target.checked)} size={size} />
          {size === 'medium' && <Typography>{field.name}</Typography>}
        </Box>
      );
    case 'select':
    case 'multi-select':
      return (
        <Box mb={size === 'small' ? 0 : 1}>
          <SelectInput
            isMulti={field.type === 'multi-select'}
            label={size === 'medium' ? field.name : undefined}
            value={field.value || (field.type === 'multi-select' ? [] : '')}
            options={field.fields?.map((opt) => ({ value: opt.value, label: opt.name })) || []}
            onChange={(e) => onChange(e)}
            size={size}
          />
        </Box>
      );
    case 'query':
      return (
        <Box display={'flex'} width={'100%'} minHeight={250} flex={1}>
          <Box p={0.1} flex={1} border={1} borderColor={'divider'} borderRadius={variables.radius.medium}>
            <SqlEditor
              value={field.value ?? ''}
              onChange={(value: string) => {
                console.log(value);
              }}
              autocomplete={{
                databases: [],
                views: [],
                schemas: [],
                tables: [],
                columns: {}
              }}
            />
          </Box>
        </Box>
      );
    default:
      return null;
  }
}
