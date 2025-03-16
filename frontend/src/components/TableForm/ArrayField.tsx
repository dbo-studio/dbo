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
  onChange: (value: any[]) => void;
}

export default function ArrayField({ field, onChange }: ArrayFieldProps) {
  const handleItemChange = (index: number, fieldId: string, fieldValue: any) => {
    const newData = [...(field.value || [])];
    const foundField = field.fields?.find((opt) => opt.id === fieldId);

    if (foundField?.type === 'multi-select') {
      newData[index] = { ...newData[index], [fieldId]: fieldValue || [] };
    } else {
      newData[index] = { ...newData[index], [fieldId]: fieldValue };
    }

    onChange(newData);
  };

  const handleDelete = (index: number) => {
    const newData = (field.value || []).filter((_, i) => i !== index);
    onChange(newData);
  };

  const handleAdd = () => {
    const newItem = field?.fields?.reduce(
      (acc, option) => {
        acc[option.id] = option.type === 'multi-select' ? [] : '';
        return acc;
      },
      {} as Record<string, any>
    );
    onChange([...(field.value || []), newItem]);
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
            {field?.fields
              ?.filter((f) => f.id !== 'empty')
              .map((item, index) => (
                <TableRow key={`${field.id}-${index}-${item.name || ''}`}>
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
                      <IconButton size='small' onClick={handleAdd}>
                        <CustomIcon type='plus' />
                      </IconButton>
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
