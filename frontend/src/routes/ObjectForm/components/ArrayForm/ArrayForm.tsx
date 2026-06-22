import { useFormObjectStore } from '@/store/formObject/formObject.store';
import { FormFieldType, FormValue } from '@/types/Tree';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import React, { memo, useCallback, useEffect } from 'react';
import { useDynamicField } from '../../hooks/useDynamicField';
import { ArrayFormContainerStyled } from './ArrayForm.styled';
import ArrayRow from './ArrayRow';

function ArrayForm({ objectTabId }: { objectTabId: string }): React.JSX.Element {
  const form = useFormObjectStore((state) => state.getFormData(objectTabId));
  const updateFormField = useFormObjectStore((state) => state.updateFormField);
  const markRowDeleted = useFormObjectStore((state) => state.markRowDeleted);
  const { getDynamicFieldStateKey, refreshDynamicField, getDynamicOptions, isLoadingDynamicField } =
    useDynamicField(objectTabId);

  const refreshRowDynamicFields = useCallback(
    (row: FormFieldType[], rowIndex: number, changedFieldId?: string) => {
      row.forEach((field) => {
        if (!field.dependsOn) {
          return;
        }

        if (changedFieldId && field.dependsOn.fieldId !== changedFieldId) {
          return;
        }

        void refreshDynamicField(getDynamicFieldStateKey(rowIndex, field.id), field, row);
      });
    },
    [getDynamicFieldStateKey, refreshDynamicField]
  );

  useEffect(() => {
    form?.data.forEach((row, rowIndex) => {
      refreshRowDynamicFields(row, rowIndex);
    });
  }, [form?.data, refreshRowDynamicFields]);

  const handleFieldChange = useCallback(
    (rowIndex: number, field: FormFieldType, value: FormValue | FormValue[]) => {
      if (!form) {
        return;
      }

      const nextRows = form.data.map((row, currentRowIndex) => {
        if (currentRowIndex !== rowIndex) {
          return row;
        }

        return row.map((cell) => (cell.id === field.id ? { ...cell, value } : cell));
      });

      updateFormField(objectTabId, rowIndex, field.id, value);

      nextRows.forEach((row, currentRowIndex) => {
        refreshRowDynamicFields(row, currentRowIndex, field.id);
      });
    },
    [form, objectTabId, refreshRowDynamicFields, updateFormField]
  );

  return (
    <ArrayFormContainerStyled>
      <TableContainer sx={{ flex: 1 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ border: 'none !important' }}>
              {form?.schema.map((field) => (
                <TableCell key={field.id} sx={{ minWidth: 150 }}>
                  {field.name}
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {form?.data.map((row, rowIndex) => {
              if (row.some((cell) => cell.deleted)) {
                return null;
              }

              return (
                <ArrayRow
                  rowIndex={rowIndex}
                  key={rowIndex}
                  rows={row}
                  getDynamicFieldStateKey={getDynamicFieldStateKey}
                  getDynamicOptions={getDynamicOptions}
                  isLoadingDynamicField={isLoadingDynamicField}
                  onFieldChange={(field, value): void => handleFieldChange(rowIndex, field, value)}
                  onDelete={(): void => markRowDeleted(objectTabId, row)}
                />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </ArrayFormContainerStyled>
  );
}

export default memo(ArrayForm);
