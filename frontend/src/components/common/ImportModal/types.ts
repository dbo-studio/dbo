export type ImportModalProps = {
  show: boolean;
  connectionId: number;
  table: string;
  onClose: () => void;
};


export type ImportButtonProps = {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export type ImportButtonStyledProps = {
  drag?: boolean;
}
