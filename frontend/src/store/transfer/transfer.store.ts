import type { ExportTarget } from '@/components/common/ExportModal/types';
import { create } from 'zustand';

type TransferState = {
  /** Whole-object export picked from the object tree's context menu. */
  exportRequest: { connectionId: number; target: ExportTarget } | null;
  /** Table import picked from the object tree's context menu. */
  importRequest: { connectionId: number; table: string } | null;
  /** MongoDB collection export / import wizards picked from the tree (the container id is `database/collection`). */
  mongoExport: { connectionId: number; containerId: string } | null;
  mongoImport: { connectionId: number; containerId: string } | null;
  openMongoExport: (connectionId: number, containerId: string) => void;
  openMongoImport: (connectionId: number, containerId: string) => void;
  openExport: (connectionId: number, target: ExportTarget) => void;
  openImport: (connectionId: number, table: string) => void;
  close: () => void;
};

export const useTransferStore = create<TransferState>()((set) => ({
  exportRequest: null,
  importRequest: null,
  mongoExport: null,
  mongoImport: null,
  openMongoExport: (connectionId, containerId): void => set({ mongoExport: { connectionId, containerId } }),
  openMongoImport: (connectionId, containerId): void => set({ mongoImport: { connectionId, containerId } }),
  openExport: (connectionId, target): void => set({ exportRequest: { connectionId, target } }),
  openImport: (connectionId, table): void => set({ importRequest: { connectionId, table } }),
  close: (): void => set({ exportRequest: null, importRequest: null, mongoExport: null, mongoImport: null })
}));
