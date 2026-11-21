import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import ConnectorDialog from '@/components/common/Settings/BackupSettingsPanel/connectors/ConnectorDialog';
import { authorizeConnector } from '@/components/common/Settings/BackupSettingsPanel/connectors/authorize';
import { specOf } from '@/components/common/Settings/BackupSettingsPanel/connectors/connectorTypes';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { DestinationGridStyled } from './DestinationPicker.styled';
import Tile from './Tile/Tile';

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
      <DestinationGridStyled>
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
      </DestinationGridStyled>
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