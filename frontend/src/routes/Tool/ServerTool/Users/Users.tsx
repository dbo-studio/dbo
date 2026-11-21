import api from '@/api';
import locales from '@/locales';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import type { ServerToolProps } from '../serverToolShared';

export default function Users({ connectionId }: ServerToolProps): JSX.Element {
  const { data, isError, error } = useQuery({
    queryKey: ['server', 'users', connectionId],
    queryFn: () => api.nosql.serverUsers(connectionId),
    retry: false
  });
  if (isError)
    return (
      <Typography color='error'>
        {(error as { response?: { data?: { message?: string } } }).response?.data?.message ?? locales.action_failed}
      </Typography>
    );
  if (!data) return <Typography color='text.secondary'>{locales.loading}</Typography>;
  if (data.length === 0) return <Typography color='text.secondary'>{locales.server_users_empty}</Typography>;

  return (
    <Table size='small'>
      <TableHead>
        <TableRow>
          <TableCell>{locales.server_user}</TableCell>
          <TableCell>{locales.server_database}</TableCell>
          <TableCell>{locales.server_roles}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((u) => (
          <TableRow key={`${u.db}.${u.user}`} data-testid='server-user'>
            <TableCell>{u.user}</TableCell>
            <TableCell>{u.db}</TableCell>
            <TableCell>{(u.roles ?? []).join(', ')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
