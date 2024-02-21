import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import Modal from '../../base/Modal/Modal';
import SelectDatabase from './SelectDatabase/SelectDatabase';

export default function Databases({ open }: { open: boolean }) {
  const { updateShowSelectDatabase } = useConnectionStore();

  const handleClose = () => {
    updateShowSelectDatabase(false);
  };

  return (
    <Modal open={open} title={locales.select_database}>
      <SelectDatabase onClose={handleClose} />
    </Modal>
  );
}
