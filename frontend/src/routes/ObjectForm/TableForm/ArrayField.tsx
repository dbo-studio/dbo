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
  // Use field.value as the source of truth (controlled component)
  const arrayValue = field.value || [];

  const handleItemChange = (index: number, fieldId: string, fieldValue: any): void => {
    const newArray = arrayValue.map((item: any, i: number) => {
      if (i === index) {
        return {
          ...item,
          [fieldId]: fieldValue
        };
      }
      return item;
    });

    onChange(newArray);
  };

  const handleDelete = (index: number): void => {
    const newArray = arrayValue.map((item: any, i: number) => {
      if (i === index) {
        return {
          ...item,
          deleted: true
        };
      }
      return item;
    });

    onChange(newArray);
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
            {arrayValue.map((item: any, index: number) => {
              // Skip deleted items
              if (item?.deleted) return null;

              // Get template fields from field.fields[0] if available
              const templateFields = field.fields?.[0]?.fields || [];

              return (
                <TableRow key={`${field.id}-${index}-${item.id || index}`}>
                  {templateFields.map((option: FormFieldType) => {
                    const itemValue = item[option.id] ?? option.value;
                    return (
                      <TableCell key={option.id} sx={{ minWidth: 150 }}>
                        <SimpleField
                          size='small'
                          field={{
                            ...option,
                            value: itemValue
                          }}
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
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
