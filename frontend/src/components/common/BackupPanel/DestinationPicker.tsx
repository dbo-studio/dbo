import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Box, ButtonBase, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, type ReactNode, useState } from 'react';
import ConnectorDialog from '@/components/common/Settings/BackupSettingsPanel/connectors/ConnectorDialog';
import { authorizeConnector } from '@/components/common/Settings/BackupSettingsPanel/connectors/authorize';
import { specOf } from '@/components/common/Settings/BackupSettingsPanel/connectors/connectorTypes';

function Tile({
  selected,
  onClick,
  icon,
  title,
  sub,
  warn,
  testId
}: {
  selected?: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  sub?: string;
  warn?: boolean;
  testId?: string;
}): JSX.Element {
  return (
    <ButtonBase
      onClick={onClick}
      data-testid={testId}
      aria-pressed={selected}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 1,
        p: 1.25,
        textAlign: 'left',
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'transparent',
        borderRadius: 0.5
      }}
    >
      <Box sx={{ display: 'flex', color: selected ? 'primary.main' : 'text.secondary' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant='body2' noWrap color='textTitle'>
          {title}
        </Typography>
        {sub && (
          <Typography variant='caption' noWrap component='p' color={warn ? 'warning.main' : 'textSubdued'}>
            {sub}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
}

/** Where backups are copied, as tiles; a destination can be added without leaving the form. */
export default function DestinationPicker({
  value,
  onChange
}: {
  value: number;
  onChange: (id: number) => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const { data: destinations = [] } = useQuery({
    queryKey: ['backup-connectors', 'destination'],
    queryFn: () => api.backup.connectors('destination')
  });

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 1 }}>
        <Tile
          testId='destination-local'
          selected={value === 0}
          onClick={() => onChange(0)}
          icon={<CustomIcon type='hardDrive' size='s' />}
          title={locales.backup_dest_this_device}
          sub={locales.backup_dest_this_device_hint}
        />
        {destinations
          .filter((d) => d.enabled)
          .map((d) => {
            const spec = specOf(d.type);
            const needsAuth = spec?.oauth === true && !d.secretsSet.refreshToken;
            return (
              <Tile
                key={d.id}
                testId={`destination-${d.id}`}
                selected={value === d.id}
                onClick={() => onChange(d.id)}
                icon={<CustomIcon type={spec?.icon ?? 'cloud'} size='s' />}
                title={d.name}
                sub={needsAuth ? locales.backup_dest_needs_auth : spec?.label}
                warn={needsAuth}
              />
            );
          })}
        <Tile
          testId='destination-add'
          onClick={() => setAdding(true)}
          icon={<CustomIcon type='plus' size='s' />}
          title={locales.backup_dest_add}
        />
      </Box>
      <Typography variant='caption' color='textSubdued'>
        {value === 0 ? locales.backup_wizard_local_folder_hint : locales.backup_dest_also_local}
      </Typography>

      {adding && (
        <ConnectorDialog
          kind='destination'
          onClose={() => setAdding(false)}
          onSaved={(saved) => {
            setAdding(false);
            void queryClient.invalidateQueries({ queryKey: ['backup-connectors', 'destination'] });
            onChange(saved.id);
            if (specOf(saved.type)?.oauth && !saved.secretsSet.refreshToken) void authorizeConnector(saved);
          }}
        />
      )}
    </>
  );
}
