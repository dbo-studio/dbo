import { Box } from '@mui/material';
import type { JSX } from 'react';
import { useObjectActions } from '../hooks/useObjectActions';
import type { TableFormProps } from '../types';
import ArrayField from './ArrayField';
import FormFields from './FormFields';
import StatusBar from './StatusBar/StatusBar';

export default function TableForm({ formSchema }: TableFormProps): JSX.Element {
  const { handleSave, handleCancel, handleAddArrayItem, handleFieldChange } = useObjectActions();

  const simpleFields = formSchema.filter((field) => field.type !== 'array');
  const arrayFields = formSchema.filter((field) => field.type === 'array');

  return (
    <Box overflow={'hidden'} flexDirection={'column'} display={'flex'} padding={1} width={'100%'}>
      <Box flex={1} overflow={'auto'}>
        <FormFields fields={simpleFields} onChange={(field, value): void => handleFieldChange(field, value)} />
        {arrayFields.map((field) => (
          <Box key={field.id}>
            <ArrayField field={field} onChange={(value): void => handleFieldChange(field.id, value)} />
          </Box>
        ))}
      </Box>
      <StatusBar
        onSave={handleSave}
        onCancel={handleCancel}
        onAdd={arrayFields.length > 0 ? (): void => handleAddArrayItem(arrayFields[0]) : undefined}
        disabled={!formSchema}
      />
    </Box>
  );
}
