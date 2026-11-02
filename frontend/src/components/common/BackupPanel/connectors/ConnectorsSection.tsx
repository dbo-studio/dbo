import api from '@/api';
import type { ConnectorKind, ConnectorType } from '@/api/backup/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Button, Chip, Typography } from '@mui/material';
import { openUrl } from '@tauri-apps/plugin-opener';
import { tools } from '@/core/utils/tools';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import {
  CardRowIconStyled,
  CardRowMainStyled,
  CardRowStyled,
  CardStyled,
  SectionActionsStyled,
  SectionHeadStyled
} from '../BackupPanel.styled';
import ConnectorDialog from './ConnectorDialog';
import { specOf } from './connectorTypes';

type Editing = { connector?: ConnectorType } | null;

export default function ConnectorsSection({ kind }: { kind: ConnectorKind }): JSX.Element {
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

  const authorize = async (item: ConnectorType): Promise<void> => {
    try {
      const url = await api.backup.driveAuthUrl(item.id);
      if (await tools.isTauri()) await openUrl(url);
      else window.open(url, '_blank');
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

  return (
    <>
      <SectionHeadStyled>
        <SectionActionsStyled sx={{ ml: 0 }}>
          <Button size='small' variant='contained' onClick={() => setEditing({})} data-testid={`connector-add-${kind}`}>
            {isDestination ? locales.connector_add_destination : locales.connector_add_channel}
          </Button>
        </SectionActionsStyled>
      </SectionHeadStyled>

      {items.length === 0 ? (
        <CardStyled>
          <EmptyState
            icon={isDestination ? 'cloud' : 'bell'}
            title={isDestination ? locales.connector_empty_destinations : locales.connector_empty_channels}
            description={
              isDestination ? locales.connector_empty_destinations_hint : locales.connector_empty_channels_hint
            }
          />
        </CardStyled>
      ) : (
        <CardStyled>
          {items.map((item) => {
            const spec = specOf(item.type);
            const needsAuth = item.type === 'gdrive' && !item.secretsSet.refreshToken;

            return (
              <CardRowStyled key={item.id} data-testid={`connector-${item.id}`}>
                <CardRowIconStyled>
                  <CustomIcon type={spec?.icon ?? 'cloud'} size='s' />
                </CardRowIconStyled>
                <CardRowMainStyled>
                  <Typography variant='body2' color='textTitle' noWrap>
                    {item.name}
                  </Typography>
                  <Typography variant='caption' color='textSecondary' noWrap component='p'>
                    {spec?.label ?? item.type}
                  </Typography>
                </CardRowMainStyled>
                {!item.enabled && <Chip size='small' label={locales.connector_disabled} />}
                {item.type === 'gdrive' && (
                  <Chip
                    size='small'
                    color={needsAuth ? 'default' : 'success'}
                    label={needsAuth ? locales.connector_authorize : locales.connector_authorized}
                  />
                )}
                {needsAuth && (
                  <Button size='small' variant='outlined' onClick={() => void authorize(item)}>
                    {locales.connector_authorize}
                  </Button>
                )}
                <Button size='small' onClick={() => void test(item)} disabled={needsAuth}>
                  {locales.connector_test}
                </Button>
                <Button size='small' onClick={() => setEditing({ connector: item })}>
                  {locales.connector_edit}
                </Button>
                <Button size='small' color='error' onClick={() => remove(item)}>
                  {locales.delete}
                </Button>
              </CardRowStyled>
            );
          })}
        </CardStyled>
      )}

      {editing && (
        <ConnectorDialog
          key={editing.connector?.id ?? 'new'}
          kind={kind}
          connector={editing.connector}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
