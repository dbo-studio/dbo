import api from '@/api';
import locales from '@/locales';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import SettingsTabs from '../SettingsTabs/SettingsTabs';
import ConnectorsSection from './connectors/ConnectorsSection';

/** Where backups are sent and who is told about them. Schedules pick from these. */
export default function BackupSettingsPanel(): JSX.Element {
  const { data: destinations = [] } = useQuery({
    queryKey: ['backup-connectors', 'destination'],
    queryFn: () => api.backup.connectors('destination')
  });
  const { data: channels = [] } = useQuery({
    queryKey: ['backup-connectors', 'channel'],
    queryFn: () => api.backup.connectors('channel')
  });

  return (
    <SettingsTabs
      tabs={[
        {
          id: 'destinations',
          label: locales.backup_nav_destinations,
          count: destinations.length,
          ids: ['backup.destinations'],
          content: (
            <ConnectorsSection
              kind='destination'
              title={locales.backup_nav_destinations}
              description={locales.backup_nav_destinations_hint}
            />
          )
        },
        {
          id: 'channels',
          label: locales.backup_nav_notifications,
          count: channels.length,
          ids: ['backup.channels'],
          content: (
            <ConnectorsSection
              kind='channel'
              title={locales.backup_nav_notifications}
              description={locales.backup_nav_notifications_hint}
            />
          )
        }
      ]}
    />
  );
}
