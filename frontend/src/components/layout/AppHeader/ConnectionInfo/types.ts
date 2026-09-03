export type ConnectionBoxStyledProps = {
  status: ConnectionBoxStatus;
};

export type ConnectionBoxStatus = 'error' | 'finished' | 'loading' | 'disable';

export type ConnectionInfoProps = {
  compact?: boolean;
};
