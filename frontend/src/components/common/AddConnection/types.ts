import type { CreateConnectionRequestType } from '@/api/connection/types';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { ConnectionType } from '@/types';

export type SelectionConnectionType = {
  name: string;
  logo: keyof typeof IconTypes;
  component: React.ComponentType<ConnectionSettingsProps>;
};

export type ConnectionItemProps = {
  connection: SelectionConnectionType;
  selected: boolean;
  onClick: (connection: SelectionConnectionType) => void;
};

export type ConnectionItemStyledProps = {
  selected?: boolean | string;
};

export type ConnectionSelectionProps = {
  connections: SelectionConnectionType[];
  onSubmit: (connection: SelectionConnectionType | undefined) => void;
  onClose: () => void;
};

export type ConnectionSettingsProps = {
  connection?: ConnectionType;
  pingLoading: boolean;
  submitLoading: boolean;
  onSubmit(data: CreateConnectionRequestType): void;
  onPing(data: CreateConnectionRequestType): void;
  onClose: () => void;
};
