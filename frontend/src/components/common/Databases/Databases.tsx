import locales from '@/locales';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../../base/Modal/Modal';
import AddDatabase from './AddDatabase/AddDatabase';
import SelectDatabase from './SelectDatabase/SelectDatabase';

export default function Databases({ open }: { open: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(0);

  const handleClose = () => {
    setSearchParams({ ...searchParams, showSelectDatabase: 'false' });
    setStep(0);
  };

  return (
    <Modal open={open} title={step === 0 ? locales.select_database : locales.create_database}>
      {step === 0 && <SelectDatabase onChangeStep={() => setStep(1)} onClose={handleClose} />}
      {step === 1 && <AddDatabase onClose={handleClose} />}
    </Modal>
  );
}
