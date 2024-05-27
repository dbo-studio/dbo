import Modal from '@/src/components/base/Modal/Modal';
import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { useState } from 'react';
import ConnectionSelection from '../ConnectionSelection/ConnectionSelection';
import ConnectionSetting from '../ConnectionSettings/ConnectionSettings';
import { ConnectionType } from '../types';

const connectionTypes: ConnectionType[] = [
  {
    name: 'PostgreSQL',
    logo: '/images/connections/postgresql_logo.svg',
    port: 5432,
    host: 'localhost'
  }
];

export default function AddConnection() {
  const { updateShowAddConnection, showAddConnection } = useConnectionStore();
  const [connectionType, setConnectionType] = useState<ConnectionType | undefined>(undefined);
  const [step, setStep] = useState(0);

  const handleClose = () => {
    setConnectionType(undefined);
    updateShowAddConnection(false);
    setStep(0);
  };

  const handleSetConnection = (connection: ConnectionType | undefined) => {
    setConnectionType(connection);
    setStep(1);
  };

  return (
    <Modal open={showAddConnection} title={locales.new_connection}>
      {step == 0 && (
        <ConnectionSelection onClose={handleClose} onSubmit={handleSetConnection} connections={connectionTypes} />
      )}
      {step == 1 && connectionTypes && <ConnectionSetting onClose={handleClose} connection={connectionType} />}
    </Modal>
  );
}
