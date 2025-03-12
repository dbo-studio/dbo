import type { FormFieldType } from '@/api/tree/types';
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
import CustomIcon from '../base/CustomIcon/CustomIcon';
import SimpleField from './SimpleField';

interface ArrayFieldProps {
  field: FormFieldType;
  value: any[];
  onChange: (value: any[]) => void;
}

export default function ArrayField({ field, value = [], onChange }: ArrayFieldProps) {
  const handleItemChange = (index: number, fieldId: string, fieldValue: any) => {
    const newData = [...value];
    const foundField = field.options?.find((opt) => opt.id === fieldId);

    if (foundField?.type === 'multi-select') {
      newData[index] = { ...newData[index], [fieldId]: fieldValue || [] };
    } else {
      newData[index] = { ...newData[index], [fieldId]: fieldValue };
    }

    onChange(newData);
  };

  const handleDelete = (index: number) => {
    const newData = value.filter((_, i) => i !== index);
    onChange(newData);
  };

  const handleAdd = () => {
    const newItem = field?.options?.reduce(
      (acc, option) => {
        acc[option.id] = option.type === 'multi-select' ? [] : '';
        return acc;
      },
      {} as Record<string, any>
    );
    onChange([...value, newItem]);
  };

  return (
    <Box height='100%' display='flex' flexDirection='column'>
      <Stack direction={'row'} spacing={1} mt={1} mb={1}>
        <IconButton size='small' onClick={handleAdd}>
          <Stack direction={'row'} spacing={1} alignItems={'center'}>
            <CustomIcon type='plus' />
          </Stack>
        </IconButton>
        <IconButton size='small' onClick={handleAdd}>
          <Stack direction={'row'} spacing={1} alignItems={'center'}>
            <CustomIcon type='code' />
          </Stack>
        </IconButton>
      </Stack>
      <Divider />
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              {field?.options?.map((option) => (
                <TableCell sx={{ minWidth: 150 }} key={option.id}>
                  {option.name}
                </TableCell>
              ))}
              <TableCell sx={{ minWidth: 50 }}>Add</TableCell>
              <TableCell sx={{ minWidth: 50 }}>Remove</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {value.map((item, index) => (
              <TableRow key={`${field.id}-${index}-${item.name || ''}`}>
                {field?.options?.map((option) => (
                  <TableCell key={option.id} sx={{ minWidth: 150 }}>
                    <SimpleField
                      size='small'
                      field={option as unknown as FormFieldType}
                      value={item[option.id]}
                      onChange={(newValue) => handleItemChange(index, option.id, newValue)}
                    />
                  </TableCell>
                ))}

                <TableCell sx={{ minWidth: 50 }}>
                  <IconButton size='small' onClick={handleAdd}>
                    <CustomIcon type='plus' />
                  </IconButton>
                </TableCell>

                <TableCell sx={{ minWidth: 50 }}>
                  <IconButton size='small' onClick={() => handleDelete(index)}>
                    <CustomIcon type='delete' />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
