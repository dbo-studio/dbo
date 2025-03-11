import type { FormFieldType } from '@/api/tree/types';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import ArrayField from './ArrayField';
import FormFields from './FormFields';

interface TableFormProps {
  formSchema: FormFieldType[];
  formData?: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

export default function TableForm({ formSchema, formData, onChange }: TableFormProps) {
  const [formState, setFormState] = useState<Record<string, any>>(formData || {});

  useEffect(() => {
    if (formData) {
      setFormState(formData);
    }
  }, [formData]);

  const handleFormChange = (field: string, value: any) => {
    const newState = { ...formState, [field]: value };
    console.log('🚀 ~ handleFormChange ~ newState:', newState);
    setFormState(newState);
    onChange(newState);
  };

  const simpleFields = formSchema.filter((field) => field.type !== 'array');
  const arrayFields = formSchema.filter((field) => field.type === 'array');

  return (
    <Box overflow={'auto'} padding={1} width={'100%'}>
      <FormFields fields={simpleFields} values={formState} onChange={handleFormChange} />
      {arrayFields.map((field) => (
        <Box key={field.id}>
          <ArrayField
            field={field}
            value={formState[field.id] || []}
            onChange={(value) => handleFormChange(field.id, value)}
          />
        </Box>
      ))}
    </Box>
  );
}
