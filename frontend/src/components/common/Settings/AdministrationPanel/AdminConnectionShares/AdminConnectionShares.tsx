import api from '@/api';
import locales from '@/locales';
import { Button, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { AdministrationUserTableContainerStyled } from '../AdministrationPanel.styled';

function shareRoleLabel(role: string): string {
  if (role === 'editor') {
    return locales.share_role_editor;
  }
  return locales.share_role_viewer;
}

export default function AdminConnectionShares(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['admin-shares'],
    queryFn: api.connection.listAdminShares
  });

  const revokeMutation = useMutation({
    mutationFn: ({ connectionId, userId }: { connectionId: number; userId: string }) =>
      api.connection.deleteShare(connectionId, userId),
    onSuccess: async () => {
      toast.success(locales.share_revoked);
      await queryClient.invalidateQueries({ queryKey: ['admin-shares'] });
      await queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: () => toast.error(locales.share_failed)
  });

  if (isLoading) {
    return (
      <Typography color='textText' variant='body2'>
        {locales.loading}
      </Typography>
    );
  }

  if (shares.length === 0) {
    return (
      <Typography color='textText' variant='body2'>
        {locales.admin_shares_empty}
      </Typography>
    );
  }

  const rows = shares.flatMap((share) =>
    share.members.map((member) => ({
      share,
      member
    }))
  );

  return (
    <AdministrationUserTableContainerStyled>
      <Table size='small' data-testid='admin-shares-table' aria-label={locales.admin_shares}>
        <TableHead>
          <TableRow>
            <TableCell>{locales.admin_share_connection}</TableCell>
            <TableCell>{locales.admin_share_owner}</TableCell>
            <TableCell>{locales.share_user}</TableCell>
            <TableCell>{locales.share_role}</TableCell>
            <TableCell>{locales.admin_share_password}</TableCell>
            <TableCell align='right'>{locales.admin_actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ share, member }) => (
            <TableRow
              key={`${share.connectionId}-${member.userId}`}
              data-testid={`admin-share-row-${share.connectionName}-${member.email}`}
            >
              <TableCell>
                <Typography color='textTitle' variant='body2' noWrap title={share.connectionName}>
                  {share.connectionName}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant='body2' noWrap title={share.ownerEmail}>
                  {share.ownerEmail}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant='body2' noWrap title={member.email}>
                  {member.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip size='small' variant='outlined' label={shareRoleLabel(member.role)} />
              </TableCell>
              <TableCell>
                <Chip
                  size='small'
                  variant='outlined'
                  color={share.passwordShared ? 'warning' : 'default'}
                  label={share.passwordShared ? locales.admin_on : locales.admin_off}
                />
              </TableCell>
              <TableCell align='right'>
                <Button
                  size='small'
                  color='error'
                  disabled={revokeMutation.isPending}
                  data-testid={`admin-share-revoke-${share.connectionName}-${member.email}`}
                  onClick={(): void => {
                    void revokeMutation.mutateAsync({ connectionId: share.connectionId, userId: member.userId });
                  }}
                >
                  {locales.share_revoke}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdministrationUserTableContainerStyled>
  );
}
