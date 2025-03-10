import type { FormFieldType } from '@/api/tree/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { Box, Checkbox, Typography } from '@mui/material';

interface SimpleFieldProps {
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  size?: 'small' | 'medium';
}

export default function SimpleField({ field, value, onChange, size = 'medium' }: SimpleFieldProps) {
  switch (field.type) {
    case 'text':
      return (
        <FieldInput
          margin='none'
          label={size === 'medium' ? field.name : undefined}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          size={size}
          fullWidth
        />
      );
    case 'checkbox':
      return (
        <Box display='flex' alignItems='center'>
          <Checkbox checked={value || false} onChange={(e) => onChange(e.target.checked)} size={size} />
          {size === 'medium' && <Typography>{field.name}</Typography>}
        </Box>
      );
    case 'select':
      return (
        <SelectInput
          label={size === 'medium' ? field.name : undefined}
          value={value || ''}
          options={field.options?.map((opt) => ({ value: opt.value, label: opt.name })) || []}
          onChange={(e) => onChange(e.value)}
          size={size}
        />
      );
    default:
      return null;
  }
}
