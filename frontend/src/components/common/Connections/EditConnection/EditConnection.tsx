import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import ConnectionSetting from './ConnectionSettings/ConnectionSettings';

export default function EditConnection() {
  const { updateShowEditConnection, showEditConnection } = useConnectionStore();

  const handleClose = () => {
    updateShowEditConnection(undefined);
  };

  return (
    <Modal open={showEditConnection !== undefined} title={locales.edit_connection}>
      <ConnectionSetting onClose={handleClose} connection={showEditConnection} />
    </Modal>
  );
}
