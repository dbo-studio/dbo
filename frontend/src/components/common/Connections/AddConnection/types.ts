export type ConnectionType = {
  name: string;
  logo: string;
  host: string;
  port: number;
};

export type ConnectionItemProps = {
  connection: ConnectionType;
  selected: boolean;
  onClick: (connection: ConnectionType) => void;
};

export type ConnectionItemStyledProps = {
  selected?: boolean | string;
};

export type ConnectionSelectionProps = {
  connections: ConnectionType[];
  onSubmit: (connection: ConnectionType | undefined) => void;
  onClose: () => void;
};

export type ConnectionSettingsProps = {
  connection: ConnectionType | undefined;
  onClose: () => void;
};
