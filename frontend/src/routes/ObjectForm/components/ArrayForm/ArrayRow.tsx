import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { IconButton, Stack, TableCell, TableRow } from '@mui/material';
import React, { memo } from 'react';
import type { ArrayRowProps } from '../../types';
import SimpleField from '../SimpleForm/SimpleField';

function ArrayRow({
  rowIndex,
  rows,
  getDynamicFieldStateKey,
  getDynamicOptions,
  isLoadingDynamicField,
  onFieldChange,
  onDelete
}: ArrayRowProps): React.JSX.Element {
  return (
    <TableRow>
      {rows.map((field) => {
        const stateKey = getDynamicFieldStateKey(rowIndex, field.id);

        return (
          <TableCell key={field.id} sx={{ minWidth: 180 }} data-testid={`object-form-cell-${rowIndex}-${field.id}`}>
            <SimpleField
              isArrayForm={true}
              field={field}
              onChange={(value): void => onFieldChange(field, value)}
              dynamicOptions={field.dependsOn ? getDynamicOptions(stateKey) : undefined}
              isLoadingDynamic={field.dependsOn ? isLoadingDynamicField(stateKey) : false}
            />
          </TableCell>
        );
      })}
      <TableCell>
        <Stack direction='row' spacing={1}>
          <IconButton size='small' onClick={onDelete} data-testid={`object-form-delete-row-${rowIndex}`}>
            <CustomIcon type='delete' />
          </IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default memo(ArrayRow);
