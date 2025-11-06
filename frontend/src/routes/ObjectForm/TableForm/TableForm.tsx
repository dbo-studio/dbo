import { Box } from '@mui/material';
import type { JSX } from 'react';
import { useObjectActions } from '../hooks/useObjectActions';
import type { TableFormProps } from '../types';
import ArrayField from './ArrayField';
import FormFields from './FormFields';
import StatusBar from './StatusBar/StatusBar';

export default function TableForm({
  formSchema,
  formData,
  onFieldChange,
  onArrayFieldChange,
  onAddArrayItem,
  showStatusBar = true,
  onSave,
  onCancel,
  isSaving = false
}: TableFormProps): JSX.Element {
  // Use provided handlers or fallback to useObjectActions (for backward compatibility)
  const objectActions = useObjectActions();
  const handleSave = onSave || objectActions.handleSave;
  const handleCancel = onCancel || objectActions.handleCancel;
  const handleAddArrayItem = onAddArrayItem || objectActions.handleAddArrayItem;
  const handleFieldChange = onFieldChange || objectActions.handleFieldChange;

  const simpleFields = formSchema.filter((field) => field.type !== 'array');
  const arrayFields = formSchema.filter((field) => field.type === 'array');

  // Get field values from formData or use field.value
  const getFieldValue = (fieldId: string, defaultValue: any) => {
    if (formData && formData[fieldId] !== undefined) {
      return formData[fieldId];
    }
    const field = formSchema.find((f) => f.id === fieldId);
    return field?.value ?? defaultValue;
  };

  const handleArrayChange = (fieldId: string, value: any[]) => {
    if (onArrayFieldChange) {
      onArrayFieldChange(fieldId, value);
    } else {
      handleFieldChange(fieldId, value);
    }
  };

  return (
    <Box overflow={'hidden'} flexDirection={'column'} display={'flex'} padding={1} width={'100%'}>
      <Box flex={1} overflow={'auto'}>
        <FormFields
          fields={simpleFields.map((field) => ({
            ...field,
            value: getFieldValue(field.id, field.value)
          }))}
          onChange={(field, value): void => handleFieldChange(field, value)}
        />
        {arrayFields.map((field) => (
          <Box key={field.id}>
            <ArrayField
              field={{
                ...field,
                value: getFieldValue(field.id, field.value) || []
              }}
              onChange={(value): void => handleArrayChange(field.id, value)}
            />
          </Box>
        ))}
      </Box>
      {showStatusBar && (
        <StatusBar
          onSave={handleSave}
          onCancel={handleCancel}
          onAdd={arrayFields.length > 0 ? (): void => handleAddArrayItem(arrayFields[0].id) : undefined}
          disabled={!formSchema || isSaving}
        />
      )}
    </Box>
  );
}
