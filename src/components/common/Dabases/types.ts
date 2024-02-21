export type SelectDatabaseProps = {
  onClose: () => void;
};

export type DatabaseItemStyledProps = {
  selected: boolean;
};

export type DatabaseItemProps = {
  selected: boolean;
  name: string;
  onClick: () => void;
};
