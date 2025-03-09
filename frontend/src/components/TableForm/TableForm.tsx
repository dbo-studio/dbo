import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { Box, Button, Checkbox, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

interface TableFormProps {
  formSchema: any;
  formData?: any;
  onChange: (data: any) => void;
}

interface ColumnData {
  name: string;
  comment: string;
  dataType: string;
  notNull: boolean;
  default: string;
  identityKind: string;
  min: number;
  max: number;
  step: number;
  cacheSize: number;
  cycled: boolean;
}

export default function TableForm({ formSchema, formData, onChange }: TableFormProps) {
  console.log(formSchema);

  const [formState, setFormState] = useState<any>(formData || {});
  const [columns, setColumns] = useState<ColumnData[]>([]);

  useEffect(() => {
    if (formData) {
      setFormState(formData);
      if (formData.columns) {
        setColumns(formData.columns);
      }
    }
  }, [formData]);

  const handleFormChange = (field: string, value: any) => {
    const newState = { ...formState, [field]: value };
    setFormState(newState);
    onChange(newState);
  };

  const handleColumnChange = (index: number, field: string, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setColumns(newColumns);
    handleFormChange('columns', newColumns);
  };

  const addColumn = () => {
    const newColumn: ColumnData = {
      name: '',
      comment: '',
      dataType: 'integer',
      notNull: false,
      default: '',
      identityKind: 'none',
      min: 0,
      max: 0,
      step: 0,
      cacheSize: 0,
      cycled: false
    };
    setColumns([...columns, newColumn]);
    handleFormChange('columns', [...columns, newColumn]);
  };

  const renderField = (field: any) => {
    switch (field.type) {
      case 'text':
        return (
          <FieldInput
            label={field.name}
            value={formState[field.id] || ''}
            onChange={(e) => handleFormChange(field.id, e.target.value)}
            fullWidth
          />
        );
      case 'checkbox':
        return (
          <Box display='flex' alignItems='center'>
            <Checkbox
              checked={formState[field.id] || false}
              onChange={(e) => handleFormChange(field.id, e.target.checked)}
            />
            <Typography>{field.name}</Typography>
          </Box>
        );
      case 'select':
        return (
          <SelectInput
            label={field.name}
            value={formState[field.id] || ''}
            options={field.options?.map((opt: any) => ({ value: opt.value, label: opt.name })) || []}
            onChange={(e) => handleFormChange(field.id, e.value)}
          />
        );
      case 'array':
        if (field.id === 'columns') {
          return (
            <Box>
              <Typography variant='h6' mb={2}>
                {field.name}
              </Typography>
              {columns.map((column, index) => (
                <Box
                  key={`column-${column.name || index}`}
                  mb={2}
                  p={2}
                  border='1px solid'
                  borderColor='divider'
                  borderRadius={1}
                >
                  <Stack spacing={2}>
                    <FieldInput
                      label='Name'
                      value={column.name}
                      onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                      fullWidth
                    />
                    <FieldInput
                      label='Comment'
                      value={column.comment}
                      onChange={(e) => handleColumnChange(index, 'comment', e.target.value)}
                      fullWidth
                    />
                    <SelectInput
                      label='Data Type'
                      value={column.dataType}
                      options={[
                        { value: 'integer', label: 'Integer' },
                        { value: 'varchar', label: 'Varchar' },
                        { value: 'text', label: 'Text' },
                        { value: 'char', label: 'Char' },
                        { value: 'numeric', label: 'Numeric' },
                        { value: 'boolean', label: 'Boolean' }
                      ]}
                      onChange={(e) => handleColumnChange(index, 'dataType', e.value)}
                    />
                    <Box display='flex' alignItems='center'>
                      <Checkbox
                        checked={column.notNull}
                        onChange={(e) => handleColumnChange(index, 'notNull', e.target.checked)}
                      />
                      <Typography>Not Null</Typography>
                    </Box>
                    <FieldInput
                      label='Default Expression'
                      value={column.default}
                      onChange={(e) => handleColumnChange(index, 'default', e.target.value)}
                      fullWidth
                    />
                    <SelectInput
                      label='Identity Kind'
                      value={column.identityKind}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'always', label: 'Always' },
                        { value: 'by default', label: 'By Default' }
                      ]}
                      onChange={(e) => handleColumnChange(index, 'identityKind', e.value)}
                    />
                    {column.identityKind !== 'none' && (
                      <>
                        <FieldInput
                          label='Min'
                          type='number'
                          value={column.min.toString()}
                          onChange={(e) => handleColumnChange(index, 'min', Number.parseInt(e.target.value, 10))}
                          fullWidth
                        />
                        <FieldInput
                          label='Max'
                          type='number'
                          value={column.max.toString()}
                          onChange={(e) => handleColumnChange(index, 'max', Number.parseInt(e.target.value, 10))}
                          fullWidth
                        />
                        <FieldInput
                          label='Step'
                          type='number'
                          value={column.step.toString()}
                          onChange={(e) => handleColumnChange(index, 'step', Number.parseInt(e.target.value, 10))}
                          fullWidth
                        />
                        <FieldInput
                          label='Cache Size'
                          type='number'
                          value={column.cacheSize.toString()}
                          onChange={(e) => handleColumnChange(index, 'cacheSize', Number.parseInt(e.target.value, 10))}
                          fullWidth
                        />
                        <Box display='flex' alignItems='center'>
                          <Checkbox
                            checked={column.cycled}
                            onChange={(e) => handleColumnChange(index, 'cycled', e.target.checked)}
                          />
                          <Typography>Cycled</Typography>
                        </Box>
                      </>
                    )}
                  </Stack>
                </Box>
              ))}
              <Box mt={2}>
                <Button variant='contained' onClick={addColumn} type='button'>
                  Add Column
                </Button>
              </Box>
            </Box>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        {formSchema.map((field: any) => (
          <Box key={field.id}>{renderField(field)}</Box>
        ))}
      </Stack>
    </Box>
  );
}
