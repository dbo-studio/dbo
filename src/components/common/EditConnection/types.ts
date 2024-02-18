import { ConnectionType } from '@/src/types';

export type ConnectionSettingsProps = {
  connection: ConnectionType | undefined;
  onClose: () => void;
};
