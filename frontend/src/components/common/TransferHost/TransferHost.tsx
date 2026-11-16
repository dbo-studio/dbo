import { useTransferStore } from '@/store/transfer/transfer.store';
import type { JSX } from 'react';
import { ExportModal } from '../ExportModal/ExportModal';
import { ImportModal } from '../ImportModal/ImportModal';
import MongoExportDialog from '../MongoTransfer/MongoExportDialog';
import MongoImportDialog from '../MongoTransfer/MongoImportDialog';

/** Hosts the export/import dialogs opened from the object tree, so the tree rows stay light. */
export default function TransferHost(): JSX.Element {
  const exportRequest = useTransferStore((s) => s.exportRequest);
  const importRequest = useTransferStore((s) => s.importRequest);
  const mongoExport = useTransferStore((s) => s.mongoExport);
  const mongoImport = useTransferStore((s) => s.mongoImport);
  const close = useTransferStore((s) => s.close);

  return (
    <>
      <ExportModal
        show={exportRequest !== null}
        connectionId={exportRequest?.connectionId ?? 0}
        target={exportRequest?.target}
        onClose={close}
      />
      <ImportModal
        show={importRequest !== null}
        connectionId={importRequest?.connectionId ?? 0}
        table={importRequest?.table ?? ''}
        onClose={close}
      />
      {mongoExport && <MongoExportDialog {...mongoExport} onClose={close} />}
      {mongoImport && <MongoImportDialog {...mongoImport} onClose={close} />}
    </>
  );
}
