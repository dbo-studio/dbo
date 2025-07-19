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
import type { ArrayFieldProps } from '../types';
import SimpleField from './SimpleField';

export default function ArrayField({ field, onChange }: ArrayFieldProps): JSX.Element {
  const handleItemChange = (index: number, fieldId: string, fieldValue: any): void => {
    const newFields = [...(field.fields || [])];

    if (newFields[index]?.fields) {
      const targetField = newFields[index].fields?.find((f: FormFieldType) => f.id === fieldId);
      if (targetField) {
        if (targetField.originalValue === undefined) {
          targetField.originalValue = targetField.value;
        }
        targetField.value = fieldValue;
      }
    }

    onChange(newFields);
  };

  const handleDelete = (index: number): void => {
    const newFields = field.fields?.map((item, i) => {
      if (i === index) {
        item.value = {
          ...item,
          deleted: true,
          fields: item.fields?.map((i) => {
            if (i.name === 'Name') {
              return {
                ...i,
                deleted: true
              };
            }
            return i;
          })
        };

        return item;
      }
      return item;
    });

    onChange(newFields || []);
  };

  return (
    <Box height='100%' display='flex' flexDirection='column'>
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              {field?.fields?.[0]?.fields?.map((option) => {
                return (
                  <TableCell sx={{ minWidth: 150 }} key={option.id}>
                    {option.name}
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
                  return (
                    <TableCell key={option.id} sx={{ minWidth: 150 }}>
                      <SimpleField
                        size='small'
                        field={option}
                        onChange={(newValue): void => handleItemChange(index, option.id, newValue)}
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
