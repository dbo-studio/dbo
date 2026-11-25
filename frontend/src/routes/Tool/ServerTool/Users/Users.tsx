import api from '@/api';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import ServerGrid from '../ServerGrid/ServerGrid';
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
  return (
    <ServerGrid
      headers={[locales.server_user, locales.server_database, locales.server_roles]}
      values={(data ?? []).map((user) => [user.user, user.db, (user.roles ?? []).join(', ')])}
      loading={!data}
      empty={locales.server_users_empty}
    />
  );
}
