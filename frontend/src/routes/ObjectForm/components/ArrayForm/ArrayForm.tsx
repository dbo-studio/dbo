import { FormValue } from '@/types/Tree';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import React, { memo, useCallback } from 'react';
import type { ArrayFormProps } from '../../types';
import ArrayRow from './ArrayRow';

function ArrayForm({ schema, data, onDataChange }: ArrayFormProps): React.JSX.Element {
  const handleFieldChange = useCallback(
    (rowIndex: number, fieldId: string, value: FormValue): void => {
      const updatedData = [...data];
      updatedData[rowIndex] = {
        ...updatedData[rowIndex],
        [fieldId]: value
      };
      onDataChange(updatedData);
    },
    [data, onDataChange]
  );

  const handleDelete = useCallback(
    (rowIndex: number): void => {
      const updatedData = data.filter((_, index) => index !== rowIndex);
      onDataChange(updatedData);
    },
    [data, onDataChange]
  );

  return (
    <Box height='100%' display='flex' flexDirection='column'>
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              {schema.map((field) => (
                <TableCell key={field.id} sx={{ minWidth: 150 }}>
                  {field.name}
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <ArrayRow
                key={index}
                schema={schema}
                rowData={row}
                onFieldChange={(fieldId, value): void => handleFieldChange(index, fieldId, value)}
                onDelete={(): void => handleDelete(index)}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default memo(ArrayForm);
