import api from '@/api';
import locales from '@/locales';
import { variables } from '@/core/theme/variables';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';

type SchemaDialogTabProps = { connectionId: number; containerId: string };
const percent = (n: number, of: number): string => `${Math.round((n / Math.max(of, 1)) * 100)}%`;

export default function Analysis({ connectionId, containerId }: SchemaDialogTabProps): JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['nosql', 'schema', connectionId, containerId],
    queryFn: () => api.nosql.schema(connectionId, containerId),
    retry: false
  });

  if (isLoading) return <Typography color='text.secondary'>{locales.loading}</Typography>;
  if (isError || !data) return <Typography color='error'>{locales.action_failed}</Typography>;

  return (
    <>
      <Typography variant='caption' color='text.secondary' data-testid='schema-sampled'>
        {locales.nosql_schema_sampled.replace('{n}', String(data.sampled))}
      </Typography>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>{locales.nosql_schema_field}</TableCell>
            <TableCell sx={{ width: 140 }}>{locales.nosql_schema_presence}</TableCell>
            <TableCell>{locales.nosql_schema_types}</TableCell>
            <TableCell>{locales.nosql_schema_top}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.fields.map((f) => (
            <TableRow key={f.path} data-testid='schema-row'>
              <TableCell sx={{ fontFamily: 'monospace' }}>{f.path}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: variables.radius.small,
                      bgcolor: 'action.hover',
                      overflow: 'hidden'
                    }}
                  >
                    <Box sx={{ width: percent(f.count, data.sampled), height: '100%', bgcolor: 'primary.main' }} />
                  </Box>
                  <Typography variant='caption'>{percent(f.count, data.sampled)}</Typography>
                </Box>
              </TableCell>
              <TableCell>{f.types.map((t) => `${t.type} ${t.count}`).join(' · ')}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', maxWidth: 260 }}>
                <Typography variant='caption' noWrap component='div'>
                  {f.top.map((v) => `${v.value} (${v.count})`).join(', ')}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
