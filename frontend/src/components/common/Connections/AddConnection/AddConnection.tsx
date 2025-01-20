import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConnectionSelection from './ConnectionSelection/ConnectionSelection';
import ConnectionSetting from './ConnectionSettings/ConnectionSettings';
import type { ConnectionType } from './types';

const connectionTypes: ConnectionType[] = [
  {
    name: 'PostgreSQL',
    logo: '/images/connections/postgresql_logo.svg',
    port: 5432,
    host: 'localhost'
  }
];

export default function AddConnection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [connectionType, setConnectionType] = useState<ConnectionType | undefined>(undefined);
  const [step, setStep] = useState(0);

  const handleClose = () => {
    setConnectionType(undefined);
    searchParams.delete('showAddConnection');
    setSearchParams(searchParams);
    setStep(0);
  };

  const handleSetConnection = (connection: ConnectionType | undefined) => {
    setConnectionType(connection);
    setStep(1);
  };

  return (
    <Modal open={searchParams.get('showAddConnection') === 'true'} title={locales.new_connection}>
      {step === 0 && (
        <ConnectionSelection onClose={handleClose} onSubmit={handleSetConnection} connections={connectionTypes} />
      )}
      {step === 1 && connectionTypes && <ConnectionSetting onClose={handleClose} connection={connectionType} />}
    </Modal>
  );
}
