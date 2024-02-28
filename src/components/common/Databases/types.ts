export type SelectDatabaseProps = {
  onClose: () => void;
  onChangeStep: () => void;
};

export type DatabaseItemStyledProps = {
  selected: boolean;
};

export type DatabaseItemProps = {
  selected: boolean;
  name: string;
  onClick: () => void;
  onDelete: () => void;
};
