export type ImportFormat = 'sql' | 'json' | 'csv';

export type ImportModalProps = {
  show: boolean;
  connectionId: number;
  table: string;
  onClose: () => void;
};

export type ImportButtonProps = {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** File types the picker offers; the SQL import's by default. */
  accept?: string;
};

export type ImportButtonStyledProps = {
  drag?: boolean;
};
