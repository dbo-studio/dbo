export type ConnectionBoxStyledProps = {
  status: ConnectionBoxStatus;
};

export type ConnectionBoxStatus = 'error' | 'finished' | 'loading' | 'disable';
