import { Box } from '@mui/material';
import { useObjectActions } from '../hooks/useObjectActions';
import type { TableFormProps } from '../types';
import ArrayField from './ArrayField';
import FormFields from './FormFields';
import StatusBar from './StatusBar/StatusBar';

export default function TableForm({ tabId, formSchema, onChange }: TableFormProps) {
  const { handleSave, handleCancel, handleFormChange, handleAddArrayItem } = useObjectActions(tabId);

  const simpleFields = formSchema.filter((field) => field.type !== 'array');
  const arrayFields = formSchema.filter((field) => field.type === 'array');

  return (
    <Box overflow={'hidden'} flexDirection={'column'} display={'flex'} padding={1} width={'100%'}>
      <Box flex={1} overflow={'auto'}>
        <FormFields
          fields={simpleFields}
          onChange={(field, value) => handleFormChange(formSchema, field, value, onChange)}
        />
        {arrayFields.map((field) => (
          <Box key={field.id}>
            <ArrayField
              field={field}
              onChange={(value) => handleFormChange(formSchema, field.id, value, onChange)}
              onAdd={() =>
                handleAddArrayItem(field, (value) => handleFormChange(formSchema, field.id, value, onChange))
              }
            />
          </Box>
        ))}
      </Box>
      <StatusBar
        onSave={() => handleSave(formSchema)}
        onCancel={handleCancel}
        onAdd={
          arrayFields.length > 0
            ? () =>
                handleAddArrayItem(arrayFields[0], (value) =>
                  handleFormChange(formSchema, arrayFields[0].id, value, onChange)
                )
            : undefined
        }
        disabled={!formSchema}
      />
    </Box>
  );
}
