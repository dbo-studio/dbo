import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTheme } from '@mui/material';
import Handsontable from 'handsontable';
// @ts-ignore
import type Core from 'handsontable/core';
import { registerRenderer } from 'handsontable/renderers/registry';
// @ts-ignore
import type { CellProperties } from 'handsontable/settings';

export const useHandleRowStyle = () => {
  const { getRemovedRows, getUnsavedRows, getEditedRows } = useDataStore();
  const theme = useTheme();

  const handleRowStyle = (
    instance: Core,
    td: HTMLTableCellElement,
    row: number,
    col: number,
    prop: string | number,
    value: any,
    cellProperties: CellProperties
  ) => {
    Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);

    if (value === null) {
      td.innerHTML = `<span style='color: ${theme.palette.text.disabled}'>NULL</span>`; // Replace 'Custom Value' with the desired value
    }

    td.classList.remove('removed-highlight', 'unsaved-highlight', 'edit-highlight');

    if (getRemovedRows().some((v) => v.dbo_index === row)) {
      td.classList.add('removed-highlight');
    }

    if (getUnsavedRows().some((v) => v.dbo_index === row)) {
      td.classList.add('unsaved-highlight');
    }

    if (getEditedRows().some((v) => v.dboIndex === row)) {
      td.classList.add('edit-highlight');
    }
  };

  registerRenderer('handleRowStyle', handleRowStyle);
};
