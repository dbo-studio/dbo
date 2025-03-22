import { Box } from '@mui/material';
import { useObjectActions } from '../hooks/useObjectActions';
import type { TableFormProps } from '../types';
import ArrayField from './ArrayField';
import FormFields from './FormFields';
import StatusBar from './StatusBar/StatusBar';

export default function TableForm({ tabId, formSchema }: TableFormProps) {
  const { handleSave, handleCancel, handleAddArrayItem, handleFieldChange } = useObjectActions(tabId);

  const simpleFields = formSchema.filter((field) => field.type !== 'array');
  const arrayFields = formSchema.filter((field) => field.type === 'array');

  return (
    <Box overflow={'hidden'} flexDirection={'column'} display={'flex'} padding={1} width={'100%'}>
      <Box flex={1} overflow={'auto'}>
        <FormFields fields={simpleFields} onChange={(field, value) => handleFieldChange(formSchema, field, value)} />
        {arrayFields.map((field) => (
          <Box key={field.id}>
            <ArrayField
              field={field}
              onChange={(value) => handleFieldChange(formSchema, field.id, value)}
              onAdd={() => handleAddArrayItem(field)}
            />
          </Box>
        ))}
      </Box>
      <StatusBar
        onSave={() => handleSave(formSchema)}
        onCancel={handleCancel}
        onAdd={arrayFields.length > 0 ? () => handleAddArrayItem(arrayFields[0]) : undefined}
        disabled={!formSchema}
      />
    </Box>
  );
}
