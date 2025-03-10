import type { FormFieldType } from '@/api/tree/types';
import {
  Box,
  Button,
  IconButton,
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
    newData[index] = { ...newData[index], [fieldId]: fieldValue };
    onChange(newData);
  };

  const handleDelete = (index: number) => {
    const newData = value.filter((_, i) => i !== index);
    onChange(newData);
  };

  const handleAdd = () => {
    const newItem = field?.options?.reduce(
      (acc, option) => {
        acc[option.id] = '';
        return acc;
      },
      {} as Record<string, any>
    );
    onChange([...value, newItem]);
  };

  return (
    <Box>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              {field?.options?.map((option) => (
                <TableCell key={option.id}>{option.name}</TableCell>
              ))}
              <TableCell width={50} />
            </TableRow>
          </TableHead>
          <TableBody>
            {value.map((item, index) => (
              <TableRow key={`${field.id}-${index}-${item.name || ''}`}>
                {field?.options?.map((option) => (
                  <TableCell key={option.id}>
                    <SimpleField
                      size='small'
                      field={option as unknown as FormFieldType}
                      value={item[option.id]}
                      onChange={(newValue) => handleItemChange(index, option.id, newValue)}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <IconButton size='small' onClick={() => handleDelete(index)}>
                    <CustomIcon type='delete' />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box mt={2}>
        <Button variant='contained' onClick={handleAdd}>
          Add {field.name}
        </Button>
      </Box>
    </Box>
  );
}
