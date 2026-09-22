import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { getConnectionAlias } from '@/core/db/connectionAliases';
import locales from '@/locales';
import type { ConnectionType } from '@/types';
import { Box, Button, Checkbox, Chip, Typography } from '@mui/material';
import type { JSX, MouseEvent } from 'react';
import {
  ShareModalExistingActionsStyled,
  ShareModalPickerRowMainStyled,
  ShareModalPickerRowStyled,
  ShareModalPickerRowTextStyled
} from './AdminShareConnectionsModal.styled';

const roleOptions: SelectInputOption[] = [
  { label: locales.share_role_viewer, value: 'viewer' },
  { label: locales.share_role_editor, value: 'editor' }
];

export type ShareConnectionPickerRowProps = {
  connection: ConnectionType;
  mode: 'pick' | 'existing';
  checked?: boolean;
  role?: string;
  passwordShared?: boolean;
  pending?: boolean;
  onToggle?: (connectionId: number, checked: boolean) => void;
  onRoleChange?: (connectionId: number, role: string) => void;
  onRevoke?: (connectionId: number) => void;
};

export default function ShareConnectionPickerRow({
  connection,
  mode,
  checked = false,
  role = 'viewer',
  passwordShared = false,
  pending = false,
  onToggle,
  onRoleChange,
  onRevoke
}: ShareConnectionPickerRowProps): JSX.Element {
  const engineIcon = (getConnectionAlias(connection.type)?.logo ??
    connection.icon ??
    connection.type) as keyof typeof IconTypes;

  const handleRowClick = (): void => {
    if (mode !== 'pick' || pending) {
      return;
    }
    onToggle?.(Number(connection.id), !checked);
  };

  const stopPropagation = (event: MouseEvent): void => {
    event.stopPropagation();
  };

  return (
    <ShareModalPickerRowStyled
      data-testid={
        mode === 'pick' ? `admin-share-connection-${connection.name}` : `admin-share-existing-${connection.name}`
      }
      onClick={handleRowClick}
    >
      {mode === 'pick' ? (
        <Checkbox
          size='small'
          checked={checked}
          disabled={pending}
          sx={{ p: 0.5 }}
          onClick={stopPropagation}
          onChange={(e): void => onToggle?.(Number(connection.id), e.target.checked)}
        />
      ) : null}

      <ShareModalPickerRowMainStyled>
        <CustomIcon type={engineIcon} size='m' />
        <ShareModalPickerRowTextStyled>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Typography variant='body2' noWrap title={connection.name}>
              {connection.name}
            </Typography>
            {connection.shared ? (
              <Chip size='small' variant='outlined' label={locales.connections_shared} sx={{ height: 20 }} />
            ) : null}
          </Box>
          {connection.info ? (
            <Typography variant='caption' color='textText' noWrap title={connection.info}>
              {connection.info}
              {passwordShared ? ` · ${locales.share_password_on}` : ''}
            </Typography>
          ) : passwordShared ? (
            <Typography variant='caption' color='textText'>
              {locales.share_password_on}
            </Typography>
          ) : null}
        </ShareModalPickerRowTextStyled>
      </ShareModalPickerRowMainStyled>

      {mode === 'existing' ? (
        <ShareModalExistingActionsStyled onClick={stopPropagation}>
          <Box sx={{ minWidth: 120 }}>
            <SelectInput
              value={role}
              size='small'
              disabled={pending}
              options={roleOptions}
              testId={`admin-share-existing-role-${connection.name}`}
              onChange={(option): void => {
                const next = (option as SelectInputOption | null)?.value;
                if (typeof next === 'string' && next !== role) {
                  onRoleChange?.(Number(connection.id), next);
                }
              }}
            />
          </Box>
          <Button size='small' color='error' disabled={pending} onClick={(): void => onRevoke?.(Number(connection.id))}>
            {locales.share_revoke}
          </Button>
        </ShareModalExistingActionsStyled>
      ) : null}
    </ShareModalPickerRowStyled>
  );
}
