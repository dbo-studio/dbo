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
    const newFields = [...(field.fields || [])];

    if (newFields[index]?.fields) {
      const targetField = newFields[index].fields?.find((f: FormFieldType) => f.id === fieldId);
      if (targetField) {
        targetField.value = fieldValue;
      }
    }

    onChange(newFields.filter((f) => f.id !== 'empty'));
  };

  const handleDelete = (index: number) => {
    const newFields = field.fields?.filter((_, i) => i !== index);
    onChange(newFields?.filter((f) => f.id !== 'empty') || []);
  };

  const handleAdd = () => {
    const template = field.fields?.[0];
    if (!template) return;

    const newField = {
      ...template,
      id: 'object',
      fields: template.fields?.map((f) => ({
        ...f,
        value: f.type === 'multi-select' ? [] : null
      }))
    };

    const newFields = [...(field.fields || []), newField];
    onChange(newFields.filter((f) => f.id !== 'empty'));
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
