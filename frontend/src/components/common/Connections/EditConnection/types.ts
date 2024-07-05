import { ConnectionType } from '@/types';

export type ConnectionSettingsProps = {
  connection: ConnectionType | undefined;
  onClose: () => void;
};
