import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { IconButton, Stack, TableCell, TableRow } from '@mui/material';
import React, { memo, useMemo } from 'react';
import { useDynamicField } from '../../hooks/useDynamicField';
import type { ArrayRowProps, FormValue } from '../../types';
import SimpleField from '../SimpleForm/SimpleField';

function ArrayRow({ schema, rowData, onFieldChange, onDelete }: ArrayRowProps): React.JSX.Element {
  const fieldsWithValues = useMemo(() => {
    return schema.map((field) => ({
      ...field,
      value: rowData[field.id] ?? null
    }));
  }, [schema, rowData]);

  const formValues = useMemo((): Record<string, FormValue> => {
    const values: Record<string, FormValue> = {};
    fieldsWithValues.forEach((field) => {
      values[field.id] = field.value;
    });
    return values;
  }, [fieldsWithValues]);

  const { getDynamicOptions, isLoadingDynamicField } = useDynamicField(schema, formValues);

  return (
    <TableRow>
      {fieldsWithValues.map((field) => (
        <TableCell key={field.id} sx={{ minWidth: 150 }}>
          <SimpleField
            field={field}
            onChange={(value): void => onFieldChange(field.id, value)}
            dynamicOptions={field.dependsOn ? getDynamicOptions(field.id) : undefined}
            isLoadingDynamic={field.dependsOn ? isLoadingDynamicField(field.id) : false}
          />
        </TableCell>
      ))}
      <TableCell>
        <Stack direction='row' spacing={1}>
          <IconButton size='small' onClick={onDelete}>
            <CustomIcon type='delete' />
          </IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default memo(ArrayRow);
