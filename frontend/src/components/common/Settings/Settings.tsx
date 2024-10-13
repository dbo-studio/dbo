import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useSearchParams } from 'react-router-dom';

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <Modal open={searchParams.get('showSettings') === 'true'} title={locales.new_connection}>
      <div>hi</div>
    </Modal>
  );
}
