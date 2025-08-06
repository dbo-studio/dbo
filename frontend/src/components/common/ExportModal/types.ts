export type ExportModalProps = {
  show: boolean;
  connectionId: number;
  query: string;
  table: string;
  onClose: () => void;
};
