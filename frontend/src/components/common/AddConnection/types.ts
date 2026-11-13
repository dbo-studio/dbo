import type { CreateConnectionRequestType } from '@/api/connection/types';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { ConnectionType } from '@/types';
import type { ReactNode } from 'react';

import type { SSHFormValues } from './ssh';

export type SelectionConnectionType = {
  name: string;
  logo: keyof typeof IconTypes;
  type: string;
  component: React.ComponentType<ConnectionSettingsProps>;
};

export type ConnectionSettingsProps = {
  connection?: ConnectionType;
  /** Stored connection type / branding alias. */
  engine?: string;
  /** A pasted connection string to fill the form from (new connections only). */
  initialUri?: string;
  /** Overrides the submit button text (default: Update when editing, Create otherwise). */
  submitLabel?: string;
  pingLoading: boolean;
  submitLoading: boolean;
  onSubmit: (data: CreateConnectionRequestType) => void;
  onPing: (data: CreateConnectionRequestType) => void;
  onClose: () => void;
};

export type ConnectionFormTabsProps = {
  general: ReactNode;
  ssl: ReactNode;
  ssh: ReactNode;
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

export type ConnectionSSHFieldsProps = {
  value: SSHFormValues;
  onChange: (value: SSHFormValues) => void;
};
