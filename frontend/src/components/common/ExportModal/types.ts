export type ExportModalProps = {
  show: boolean;
  connectionId: number;
  query: string;
  table: string;
  /** Data tab node id; enables exporting every table of its schema/database. */
  nodeId?: string;
  onClose: () => void;
};
