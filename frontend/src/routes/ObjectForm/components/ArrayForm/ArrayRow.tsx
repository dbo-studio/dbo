import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { FormFieldOptionType, FormFieldType, FormValue } from '@/types/Tree';
import { IconButton, Stack, TableCell, TableRow } from '@mui/material';
import React, { memo } from 'react';
import SimpleField from '../SimpleForm/SimpleField';

type ArrayRowProps = {
  rowIndex: number;
  rows: FormFieldType[];
  getDynamicFieldStateKey: (scopeId: string | number, fieldId: string) => string;
  getDynamicOptions: (id: string) => FormFieldOptionType[];
  isLoadingDynamicField: (id: string) => boolean;
  onFieldChange: (field: FormFieldType, value: FormValue | FormValue[]) => void;
  onDelete: () => void;
};

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
          <TableCell key={field.id} sx={{ minWidth: 180 }}>
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
          <IconButton size='small' onClick={onDelete}>
            <CustomIcon type='delete' />
          </IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default memo(ArrayRow);
