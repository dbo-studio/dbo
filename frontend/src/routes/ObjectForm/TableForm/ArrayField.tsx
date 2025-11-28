import type { FormFieldType } from '@/api/tree/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import {
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import type { JSX } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { useDynamicFields } from '../hooks/useDynamicFields';
import type { ArrayFieldProps } from '../types';
import SimpleField from './SimpleField';

function ArrayField({ field, onChange }: ArrayFieldProps): JSX.Element {
  const handleItemChange = useCallback(
    (index: number, fieldId: string, fieldValue: any): void => {
      const updatedRows = field.fields?.map((row, i) => {
        if (i !== index) return row;

        const updatedFields = row.fields?.map((f) => {
          if (f.id !== fieldId) return f;

          // Preserve originalValue on first change
          const originalValue = f.originalValue ?? f.value;
          return { ...f, value: fieldValue, originalValue };
        });

        return { ...row, fields: updatedFields };
      });

      onChange({ ...field, fields: updatedRows });
    },
    [field, onChange]
  );

  const handleDelete = useCallback(
    (index: number): void => {
      const updatedRows = field.fields?.map((row, i) =>
        i === index ? { ...row, value: { ...row.value, deleted: true } } : row
      );

      onChange({ ...field, fields: updatedRows });
    },
    [field, onChange]
  );

  // Build formValues and allFields for dynamic fields
  const { formValues, allFields } = useMemo(() => {
    const values: Record<string, any> = {};
    const dynamicFields: FormFieldType[] = [];

    field.fields?.forEach((row, rowIndex) => {
      row.fields?.forEach((itemField) => {
        const fieldKey = `row_${rowIndex}_${itemField.id}`;
        values[fieldKey] = itemField.value;

        if (itemField.dependsOn) {
          dynamicFields.push({
            ...itemField,
            id: fieldKey,
            dependsOn: {
              ...itemField.dependsOn,
              fieldId: `row_${rowIndex}_${itemField.dependsOn.fieldId}`
            },
            metadata: {
              ...itemField.metadata,
              originalFieldId: itemField.id
            }
          });
        }
      });
    });

    return { formValues: values, allFields: dynamicFields };
  }, [field.fields]);

  const { getDynamicOptions, isLoadingDynamicField } = useDynamicFields(allFields, formValues);

  // Get schema fields from metadata (always available, even when data is empty)
  const schemaFields = (field.metadata?.schema as FormFieldType[]) || [];

  return (
    <Box height='100%' display='flex' flexDirection='column'>
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              {schemaFields.map((schemaField) => {
                return (
                  <TableCell sx={{ minWidth: 150 }} key={schemaField.id}>
                    {schemaField.name}
                  </TableCell>
                );
              })}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {field?.fields?.map((item, index) => (
              <TableRow
                sx={{
                  display: item.id === 'empty' || item?.value?.deleted ? 'none' : 'table-row'
                }}
                key={`${field.id}-${index}-${item.name || ''}`}
              >
                {item?.fields?.map((option) => {
                  const fieldKey = `row_${index}_${option.id}`;
                  return (
                    <TableCell key={option.id} sx={{ minWidth: 150 }}>
                      <SimpleField
                        size='small'
                        field={option}
                        onChange={(newValue): void => handleItemChange(index, option.id, newValue)}
                        dynamicOptions={option.dependsOn ? getDynamicOptions(fieldKey) : undefined}
                        isLoadingDynamic={option.dependsOn ? isLoadingDynamicField(fieldKey) : false}
                      />
                    </TableCell>
                  );
                })}
                <TableCell>
                  <Stack direction={'row'} spacing={1}>
                    <IconButton size='small' onClick={(): void => handleDelete(index)}>
                      <CustomIcon type='delete' />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default memo(ArrayField);
