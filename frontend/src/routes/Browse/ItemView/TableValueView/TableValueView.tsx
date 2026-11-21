import type { NoSQLItem } from '@/api/nosql/types';
import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import type { JSX } from 'react';
import { cellText } from '../itemViewUtils';

export default function TableValueView({ item }: { item: NoSQLItem }): JSX.Element {
  const rows = (Array.isArray(item.value) ? item.value : []) as Record<string, unknown>[];
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  return (
    <Box sx={{ p: 1, overflow: 'auto', height: '100%' }}>
      <Table size='small'>
        <TableHead>
          <TableRow>
            {cols.map((c) => (
              <TableCell key={c}>{c}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            // eslint-disable-next-line @eslint-react/no-array-index-key -- read-only preview rows lack stable ids
            <TableRow key={i}>
              {cols.map((c) => (
                <TableCell key={c}>{cellText(r[c])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
