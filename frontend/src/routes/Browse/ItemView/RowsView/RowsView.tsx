import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { type JSX, useState } from 'react';
import Cell from '../Cell/Cell';
import type { ItemViewRow } from '../itemViewTypes';

export default function RowsView({
  rows,
  editable,
  keyed,
  keyLabel,
  valueLabel,
  onSave
}: {
  rows: ItemViewRow[];
  editable: boolean;
  keyed: boolean;
  keyLabel: string;
  valueLabel?: string;
  onSave: (rows: ItemViewRow[]) => void;
}): JSX.Element {
  const [draft, setDraft] = useState<ItemViewRow[]>(rows);
  const setCell = (i: number, col: 0 | 1, v: string): void =>
    setDraft(draft.map((r, idx) => (idx === i ? (col === 0 ? [v, r[1]] : [r[0], v]) : r)));

  return (
    <Box sx={{ p: 1, overflow: 'auto', height: '100%' }}>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>{keyed ? keyLabel : '#'}</TableCell>
            <TableCell>{keyed ? (valueLabel ?? locales.nosql_value) : keyLabel}</TableCell>
            {editable && <TableCell />}
          </TableRow>
        </TableHead>
        <TableBody>
          {draft.map((r, i) => (
            // eslint-disable-next-line @eslint-react/no-array-index-key -- row order is the identity while editing
            <TableRow key={i}>
              <TableCell>
                {keyed ? <Cell value={r[0]} editable={editable} onChange={(v): void => setCell(i, 0, v)} /> : i}
              </TableCell>
              <TableCell>
                <Cell
                  value={keyed ? r[1] : r[0]}
                  editable={editable}
                  onChange={(v): void => setCell(i, keyed ? 1 : 0, v)}
                />
              </TableCell>
              {editable && (
                <TableCell>
                  <IconButton
                    aria-label={locales.nosql_remove_row}
                    onClick={(): void => setDraft(draft.filter((_, idx) => idx !== i))}
                  >
                    <CustomIcon type='close' size='s' />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editable && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button onClick={(): void => setDraft([...draft, ['', '']])}>{locales.nosql_add_row}</Button>
          <Button variant='contained' onClick={(): void => onSave(draft)}>
            {locales.nosql_save}
          </Button>
        </Box>
      )}
    </Box>
  );
}
