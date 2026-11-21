import { Table, TableBody, TableCell, TableRow } from '@mui/material';
import type { JSX } from 'react';
import { SERVER_TOOL_MONO } from '../serverToolShared';

export default function Facts({ rows }: { rows: [string, string][] }): JSX.Element {
  return (
    <Table size='small' sx={{ maxWidth: 520 }}>
      <TableBody>
        {rows.map(([k, v]) => (
          <TableRow key={k}>
            <TableCell>{k}</TableCell>
            <TableCell align='right' data-testid={`server-fact-${k}`} sx={{ fontFamily: SERVER_TOOL_MONO }}>
              {v}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
