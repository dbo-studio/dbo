import api from '@/api';
import type { AdminConnectionShareType } from '@/api/connection/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import type { ConnectionType } from '@/types';
import { Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AdministrationModalContainerStyled,
  AdministrationModalContentStyled
} from '../AdminUserRow/AdminUserRow.styled';
import {
  ShareModalFooterStyled,
  ShareModalPickerPanelStyled,
  ShareModalSectionPanelStyled,
  ShareModalSectionStyled,
  ShareModalToolbarActionsStyled,
  ShareModalToolbarStyled
} from './AdminShareConnectionsModal.styled';
import ShareConnectionPickerRow from './ShareConnectionPickerRow';

const roleOptions: SelectInputOption[] = [
  { label: locales.share_role_viewer, value: 'viewer' },
  { label: locales.share_role_editor, value: 'editor' }
];

export type AdminShareConnectionsModalProps = {
  open: boolean;
  userId: string;
  userEmail: string;
  onClose: () => void;
};

export default function AdminShareConnectionsModal({
  open,
  userId,
  userEmail,
  onClose
}: AdminShareConnectionsModalProps): JSX.Element {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [role, setRole] = useState('viewer');
  const [passwordShared, setPasswordShared] = useState(false);
  const [search, setSearch] = useState('');

  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: api.connection.getConnectionList,
    enabled: open
  });

  const { data: adminShares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ['admin-shares'],
    queryFn: api.connection.listAdminShares,
    enabled: open
  });

  const isLoading = connectionsLoading || sharesLoading;

  const passwordSharedByConnection = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const group of adminShares) {
      map.set(group.connectionId, group.passwordShared);
    }
    return map;
  }, [adminShares]);

  const existingByConnection = useMemo(() => {
    const map = new Map<number, AdminConnectionShareType['members'][number]>();
    for (const group of adminShares) {
      const member = group.members.find((m) => m.userId === userId);
      if (member) {
        map.set(group.connectionId, member);
      }
    }
    return map;
  }, [adminShares, userId]);

  const existingConnections = useMemo(() => {
    return Array.from(existingByConnection.entries())
      .map(([connectionId, member]) => {
        const connection = connections.find((c) => Number(c.id) === connectionId);
        return connection ? { connection, member } : null;
      })
      .filter((item): item is { connection: ConnectionType; member: AdminConnectionShareType['members'][number] } =>
        Boolean(item)
      );
  }, [connections, existingByConnection]);

  const grantableConnections = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return connections.filter((c) => {
      if (existingByConnection.has(Number(c.id))) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return c.name.toLowerCase().includes(normalized) || (c.info ?? '').toLowerCase().includes(normalized);
    });
  }, [connections, existingByConnection, search]);

  const showSearch = connections.filter((c) => !existingByConnection.has(Number(c.id))).length > 5;

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['admin-shares'] });
    await queryClient.invalidateQueries({ queryKey: ['connections'] });
  };

  const createMutation = useMutation({
    mutationFn: async (connectionIds: number[]) => {
      for (const connectionId of connectionIds) {
        await api.connection.createShare(connectionId, {
          userId,
          role,
          passwordShared
        });
      }
    },
    onSuccess: async () => {
      toast.success(locales.share_success);
      setSelectedIds([]);
      setPasswordShared(false);
      setSearch('');
      await invalidate();
    },
    onError: () => toast.error(locales.share_failed)
  });

  const revokeMutation = useMutation({
    mutationFn: (connectionId: number) => api.connection.deleteShare(connectionId, userId),
    onSuccess: async () => {
      toast.success(locales.share_revoked);
      await invalidate();
    },
    onError: () => toast.error(locales.share_failed)
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ connectionId, nextRole }: { connectionId: number; nextRole: string }) =>
      api.connection.updateShare(connectionId, userId, { role: nextRole }),
    onSuccess: async () => {
      toast.success(locales.admin_user_updated);
      await invalidate();
    },
    onError: () => toast.error(locales.share_failed)
  });

  const pending = createMutation.isPending || revokeMutation.isPending || updateRoleMutation.isPending;

  const toggleConnection = (connectionId: number, checked: boolean): void => {
    setSelectedIds((prev) => (checked ? [...prev, connectionId] : prev.filter((id) => id !== connectionId)));
  };

  const selectAllGrantable = (): void => {
    setSelectedIds(grantableConnections.map((c) => Number(c.id)));
  };

  const clearSelection = (): void => {
    setSelectedIds([]);
  };

  const handleClose = (): void => {
    setSelectedIds([]);
    setRole('viewer');
    setPasswordShared(false);
    setSearch('');
    onClose();
  };

  const selectedCountLabel = locales.admin_share_selected_count.replace('{n}', String(selectedIds.length));

  return (
    <Modal open={open} title={locales.admin_share_connections} onClose={handleClose}>
      <AdministrationModalContainerStyled data-testid='admin-share-connections-modal'>
        <AdministrationModalContentStyled>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Chip label={userEmail} size='small' variant='outlined' sx={{ alignSelf: 'flex-start' }} />
            <Typography color='textText' variant='caption'>
              {locales.admin_share_connections_hint}
            </Typography>
          </Box>

          <ShareModalSectionStyled>
            <Typography variant='subtitle2' color='textTitle'>
              {locales.admin_share_existing}
            </Typography>
            <ShareModalSectionPanelStyled data-testid='admin-share-existing-panel'>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : existingConnections.length === 0 ? (
                <Typography color='textText' variant='body2' sx={{ p: 1.5 }}>
                  {locales.admin_share_user_empty}
                </Typography>
              ) : (
                existingConnections.map(({ connection, member }) => (
                  <ShareConnectionPickerRow
                    key={connection.id}
                    connection={connection}
                    mode='existing'
                    role={member.role}
                    passwordShared={passwordSharedByConnection.get(Number(connection.id))}
                    pending={pending}
                    onRoleChange={(connectionId, nextRole): void => {
                      void updateRoleMutation.mutateAsync({ connectionId, nextRole });
                    }}
                    onRevoke={(connectionId): void => {
                      void revokeMutation.mutateAsync(connectionId);
                    }}
                  />
                ))
              )}
            </ShareModalSectionPanelStyled>
          </ShareModalSectionStyled>

          <ShareModalSectionStyled>
            <Typography variant='subtitle2' color='textTitle'>
              {locales.admin_share_add}
            </Typography>

            <ShareModalToolbarStyled>
              <SelectInput
                label={locales.share_role}
                value={role}
                options={roleOptions}
                testId='admin-share-role'
                onChange={(option): void => {
                  const next = (option as SelectInputOption | null)?.value;
                  if (typeof next === 'string') {
                    setRole(next);
                  }
                }}
              />
              <Typography variant='caption' color='textText'>
                {locales.admin_share_role_hint}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    data-testid='admin-share-password'
                    checked={passwordShared}
                    onChange={(e): void => setPasswordShared(e.target.checked)}
                    size='small'
                  />
                }
                label={locales.share_password}
              />
              {passwordShared ? (
                <Typography color='warning.main' variant='caption'>
                  {locales.share_password_warning}
                </Typography>
              ) : null}
              {showSearch ? (
                <FieldInput
                  label={locales.search}
                  value={search}
                  size='small'
                  fullWidth
                  inputProps={{ 'data-testid': 'admin-share-search' }}
                  onChange={(e): void => setSearch(e.target.value)}
                />
              ) : null}
              {grantableConnections.length > 0 ? (
                <ShareModalToolbarActionsStyled>
                  <Button size='small' disabled={pending} onClick={selectAllGrantable}>
                    {locales.admin_share_select_all}
                  </Button>
                  <Button size='small' disabled={pending || selectedIds.length === 0} onClick={clearSelection}>
                    {locales.admin_share_clear_selection}
                  </Button>
                </ShareModalToolbarActionsStyled>
              ) : null}
            </ShareModalToolbarStyled>

            <ShareModalPickerPanelStyled data-testid='admin-share-picker-panel'>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : connections.length === 0 ? (
                <Typography color='textText' variant='body2' sx={{ p: 1.5 }}>
                  {locales.admin_share_no_connections}
                </Typography>
              ) : grantableConnections.length === 0 ? (
                <Typography color='textText' variant='body2' sx={{ p: 1.5 }}>
                  {locales.admin_share_all_granted}
                </Typography>
              ) : (
                grantableConnections.map((connection) => (
                  <ShareConnectionPickerRow
                    key={connection.id}
                    connection={connection}
                    mode='pick'
                    checked={selectedIds.includes(Number(connection.id))}
                    pending={pending}
                    onToggle={toggleConnection}
                  />
                ))
              )}
            </ShareModalPickerPanelStyled>
          </ShareModalSectionStyled>
        </AdministrationModalContentStyled>

        <ShareModalFooterStyled>
          {selectedIds.length > 0 ? (
            <Typography variant='caption' color='textText' sx={{ mr: 'auto' }}>
              {selectedCountLabel}
            </Typography>
          ) : null}
          <Button size='small' onClick={handleClose}>
            {locales.cancel}
          </Button>
          <Button
            variant='contained'
            size='small'
            disabled={selectedIds.length === 0 || pending}
            data-testid='admin-share-submit'
            onClick={(): void => {
              void createMutation.mutateAsync(selectedIds);
            }}
          >
            {locales.admin_share_grant}
          </Button>
        </ShareModalFooterStyled>
      </AdministrationModalContainerStyled>
    </Modal>
  );
}
