import { Box } from '@mui/material';
import type { JSX } from 'react';
import { memo, useMemo } from 'react';
import { useObjectActions } from '../hooks/useObjectActions';
import type { TableFormProps } from '../types';
import ArrayField from './ArrayField';
import FormFields from './FormFields';
import StatusBar from './StatusBar/StatusBar';

function TableForm({ formSchema }: TableFormProps): JSX.Element {
  const { handleSave, handleCancel, handleAddArrayItem, handleUpdateArrayData, handleFieldChange } = useObjectActions();

  const { simpleFields, arrayFields } = useMemo(() => {
    const simple: typeof formSchema = [];
    const array: typeof formSchema = [];

    for (const field of formSchema) {
      if (field.metadata?.isArray) {
        array.push(field);
      } else {
        simple.push(field);
      }
    }

    return { simpleFields: simple, arrayFields: array };
  }, [formSchema]);

  return (
    <Box overflow={'hidden'} flexDirection={'column'} display={'flex'} padding={1} width={'100%'}>
      <Box flex={1} overflow={'auto'}>
        <FormFields fields={simpleFields} onChange={handleFieldChange} />
        {arrayFields.map((field) => (
          <Box key={field.id}>
            <ArrayField
              field={field}
              onChange={(updatedField): void => handleUpdateArrayData(field.id, updatedField)}
            />
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

export default memo(TableForm);
