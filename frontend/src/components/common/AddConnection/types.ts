import type { CreateConnectionRequestType } from '@/api/connection/types';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { ConnectionType } from '@/types';
import type { ReactNode } from 'react';

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
  onSubmit: (data: CreateConnectionRequestType) => void;
  onPing: (data: CreateConnectionRequestType) => void;
  onClose: () => void;
};

export type ConnectionFormTabId = 'general' | 'ssl';

export type ConnectionFormTabsProps = {
  general: ReactNode;
  ssl: ReactNode;
  generalLabel: string;
  sslLabel: string;
};

export type ConnectionSSLFieldsProps = {
  engine: 'postgresql' | 'mysql';
  mode: string;
  caCert: string;
  clientCert: string;
  clientKey: string;
  onModeChange: (mode: string) => void;
  onCaCertChange: (value: string) => void;
  onClientCertChange: (value: string) => void;
  onClientKeyChange: (value: string) => void;
};

export type SSLCertFieldProps = {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  testId: string;
  onChange: (value: string) => void;
};
