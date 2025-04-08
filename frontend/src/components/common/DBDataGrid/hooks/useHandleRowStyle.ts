import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { RowType } from '@/types';
import { useTheme } from '@mui/material'; // @ts-ignore
import Handsontable from 'handsontable';
// @ts-ignore
import type Core from 'handsontable/core';
import { registerRenderer } from 'handsontable/renderers/registry'; // @ts-ignore
// @ts-ignore
import type { CellProperties } from 'handsontable/settings';
import { useMemo } from 'react';

export const useHandleRowStyle = (): void => {
  const { getRemovedRows, getUnsavedRows, getEditedRows } = useDataStore();

  const removed = useMemo(() => getRemovedRows(), [getRemovedRows()]);
  const usesaved = useMemo(() => getUnsavedRows(), [getUnsavedRows()]);
  const edited = useMemo(() => getEditedRows(), [getEditedRows()]);
  const theme = useTheme();

  const handleRowStyle = (
    instance: Core,
    td: HTMLTableCellElement,
    row: number,
    col: number,
    prop: string | number,
    value: any,
    cellProperties: CellProperties
  ): void => {
    Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);

    if (value === null) {
      td.innerHTML = `<span style='color: ${theme.palette.text.disabled}'>NULL</span>`; // Replace 'Custom Value' with the desired value
    }

    if (value === '@DEFAULT') {
      td.innerHTML = `<span style='color: ${theme.palette.text.disabled}'>DEFAULT</span>`; // Replace 'Custom Value' with the desired value
    }

    td.classList.remove('removed-highlight', 'unsaved-highlight', 'edit-highlight');

    if (removed.some((v: RowType) => v.dbo_index === row)) {
      td.classList.add('removed-highlight');
    }

    if (usesaved.some((v: RowType) => v.dbo_index === row)) {
      td.classList.add('unsaved-highlight');
    }

    if (edited.some((v: RowType) => v.dboIndex === row)) {
      td.classList.add('edit-highlight');
    }
  };

  registerRenderer('handleRowStyle', handleRowStyle);
};
