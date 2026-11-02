import type { ExportTarget } from '@/components/common/ExportModal/types';
import { create } from 'zustand';

type TransferState = {
  /** Whole-object export picked from the object tree's context menu. */
  exportRequest: { connectionId: number; target: ExportTarget } | null;
  /** Table import picked from the object tree's context menu. */
  importRequest: { connectionId: number; table: string } | null;
  openExport: (connectionId: number, target: ExportTarget) => void;
  openImport: (connectionId: number, table: string) => void;
  close: () => void;
};

export const useTransferStore = create<TransferState>()((set) => ({
  exportRequest: null,
  importRequest: null,
  openExport: (connectionId, target): void => set({ exportRequest: { connectionId, target } }),
  openImport: (connectionId, table): void => set({ importRequest: { connectionId, table } }),
  close: (): void => set({ exportRequest: null, importRequest: null })
}));
