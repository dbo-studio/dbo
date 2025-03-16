import type { FormFieldType } from '@/api/tree/types';
import { Box } from '@mui/material';
import ArrayField from './ArrayField';
import FormFields from './FormFields';

interface TableFormProps {
  formSchema: FormFieldType[];
  onChange: (data: Record<string, any>) => void;
}

export default function TableForm({ formSchema, onChange }: TableFormProps) {
  const handleFormChange = (field: string, value: any) => {
    const formData = formSchema.reduce(
      (acc, field) => {
        acc[field.id] = field.value;
        return acc;
      },
      {} as Record<string, any>
    );

    const newState = { ...formData, [field]: value };
    onChange(newState);
  };

  const simpleFields = formSchema.filter((field) => field.type !== 'array');
  const arrayFields = formSchema.filter((field) => field.type === 'array');

  return (
    <Box overflow={'auto'} padding={1} width={'100%'}>
      <FormFields fields={simpleFields} onChange={handleFormChange} />
      {arrayFields.map((field) => (
        <Box key={field.id}>
          <ArrayField field={field} onChange={(value) => handleFormChange(field.id, value)} />
        </Box>
      ))}
    </Box>
  );
}
