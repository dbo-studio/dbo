import api from '@/api';
import type { ConnectorKind, ConnectorType } from '@/api/backup/types';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { variables } from '@/core/theme/variables';
import { Box, Button, Chip, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import {
  CardRowIconStyled,
  CardRowMainStyled,
  CardRowStyled,
  CardStyled,
  SectionHeadStyled
} from '@/components/common/BackupPanel/BackupPanel.styled';
import { authorizeConnector } from './authorize';
import ConnectorForm from './ConnectorForm';
import ConnectorIcon from './ConnectorIcon';
import { CONNECTOR_TYPES, specOf } from './connectorTypes';

type Editing = { connector?: ConnectorType; type?: string } | null;

export default function ConnectorsSection({
  kind,
  title,
  description
}: {
  kind: ConnectorKind;
  title: string;
  description: string;
}): JSX.Element {
  const queryClient = useQueryClient();
  const confirm = useConfirmModalStore((s) => s.danger);
  const queryKey = ['backup-connectors', kind];
  const { data: items = [] } = useQuery({ queryKey, queryFn: () => api.backup.connectors(kind) });
  const [editing, setEditing] = useState<Editing>(null);

  const refresh = (): void => void queryClient.invalidateQueries({ queryKey });
  const isDestination = kind === 'destination';

  const test = async (item: ConnectorType): Promise<void> => {
    try {
      await api.backup.testConnector(kind, item.id);
      toast.success(locales.connector_test_ok);
      refresh();
    } catch {
      /* the api layer already toasted */
    }
  };

  const remove = (item: ConnectorType): void =>
    confirm(locales.delete_action, locales.connector_delete_confirm, () => {
      void api.backup
        .deleteConnector(kind, item.id)
        .then(refresh)
        .catch(() => undefined);
    });

  const form = editing ? (
    <ConnectorForm
      key={editing.connector?.id ?? 'new'}
      kind={kind}
      connector={editing.connector}
      initialType={editing.type}
      onClose={() => setEditing(null)}
      onSaved={(saved) => {
        setEditing(null);
        refresh();
        // A new sign-in destination is useless until approved, so take the user straight there.
        if (specOf(saved.type)?.oauth && !saved.secretsSet.refreshToken) void authorizeConnector(saved);
      }}
    />
  ) : null;

  const addGrid = (
    <Box>
      <Typography color='textSecondary' variant='caption' component='p' sx={{ mb: 1 }}>
        {isDestination ? locales.connector_add_destination : locales.connector_add_channel}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
        {CONNECTOR_TYPES.filter((t) => t.kind === kind).map((t) => (
          <Box
            key={t.type}
            role='button'
            tabIndex={0}
            data-testid={`connector-quick-${t.type}`}
            onClick={() => setEditing({ type: t.type })}
            onKeyDown={(e) => e.key === 'Enter' && setEditing({ type: t.type })}
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              cursor: 'pointer',
              borderRadius: variables.radius.medium,
              border: `1px solid ${theme.palette.divider}`,
              '&:hover': { borderColor: theme.palette.primary.main, background: theme.palette.action.hover },
              '&:focus-visible': { outline: `1px solid ${theme.palette.primary.main}` }
            })}
          >
            <ConnectorIcon type={t.type} size={28} />
            <Typography variant='body2' color='textTitle' noWrap>
              {t.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <>
      <SectionHeadStyled>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography color='textTitle' variant='subtitle2' sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography color='textText' variant='body2'>
            {description}
          </Typography>
        </Box>
      </SectionHeadStyled>

      {items.length > 0 && (
        <CardStyled>
          {items.map((item) => {
            const spec = specOf(item.type);
            const needsAuth = spec?.oauth === true && !item.secretsSet.refreshToken;

            if (editing?.connector?.id === item.id) {
              return (
                <Box key={item.id} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                  {form}
                </Box>
              );
            }

            return (
              <CardRowStyled key={item.id} data-testid={`connector-${item.id}`}>
                <CardRowIconStyled>
                  <ConnectorIcon type={item.type} />
                </CardRowIconStyled>
                <CardRowMainStyled>
                  <Typography variant='body2' color='textTitle' noWrap>
                    {item.name}
                  </Typography>
                  <Typography variant='caption' color='textSecondary' noWrap component='p'>
                    {spec?.label ?? item.type}
                  </Typography>
                </CardRowMainStyled>
                {!item.enabled && <Chip label={locales.connector_disabled} />}
                {spec?.oauth && (
                  <Chip
                    color={needsAuth ? 'default' : 'success'}
                    label={needsAuth ? locales.connector_authorize : locales.connector_authorized}
                  />
                )}
                {needsAuth && (
                  <Button variant='outlined' onClick={() => void authorizeConnector(item)}>
                    {locales.connector_authorize}
                  </Button>
                )}
                <Button onClick={() => void test(item)} disabled={needsAuth}>
                  {locales.connector_test}
                </Button>
                <Button onClick={() => setEditing({ connector: item })}>{locales.connector_edit}</Button>
                <Button color='error' onClick={() => remove(item)}>
                  {locales.delete}
                </Button>
              </CardRowStyled>
            );
          })}
        </CardStyled>
      )}

      {editing && !editing.connector ? form : addGrid}
    </>
  );
}
