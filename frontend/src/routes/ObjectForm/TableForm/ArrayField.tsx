import type { FormFieldType } from '@/api/tree/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import {
  Box,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import type { ArrayFieldProps } from '../types';
import SimpleField from './SimpleField';

export default function ArrayField({ field, onChange, onAdd }: ArrayFieldProps) {
  const handleItemChange = (index: number, fieldId: string, fieldValue: any) => {
    const newFields = [...(field.fields || [])];

    if (newFields[index]?.fields) {
      const targetField = newFields[index].fields?.find((f: FormFieldType) => f.id === fieldId);
      if (targetField) {
        targetField.value = fieldValue;
      }
    }

    onChange(newFields);
  };

  const handleDelete = (index: number) => {
    const newFields = field.fields?.map((item, i) => {
      if (i === index) {
        return { ...item, deleted: true };
      }
      return item;
    });
    onChange(newFields || []);
  };

  return (
    <Box height='100%' display='flex' flexDirection='column'>
      <Stack direction={'row'} spacing={1} mt={1} mb={1}>
        <IconButton size='small' onClick={onAdd}>
          <Stack direction={'row'} spacing={1} alignItems={'center'}>
            <CustomIcon type='plus' />
          </Stack>
        </IconButton>
      </Stack>
      <Divider />
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
                sx={{ display: item.id === 'empty' || item.deleted ? 'none' : 'table-row' }}
                key={`${field.id}-${index}-${item.name || ''}`}
              >
                {item?.fields?.map((option) => {
                  return (
                    <TableCell key={option.id} sx={{ minWidth: 150 }}>
                      <SimpleField
                        size='small'
                        field={option}
                        onChange={(newValue) => handleItemChange(index, option.id, newValue)}
                      />
                    </TableCell>
                  );
                })}
                <TableCell>
                  <Stack direction={'row'} spacing={1}>
                    <IconButton size='small' onClick={() => handleDelete(index)}>
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
