import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { Box } from '@mui/material';
import type { ComponentProps, JSX } from 'react';
import ConnectorForm from './ConnectorForm';

type Props = ComponentProps<typeof ConnectorForm>;

/** The form in a modal, for places outside Settings (the schedule form) that add a connector on the spot. */
export default function ConnectorDialog(props: Props): JSX.Element {
  const { kind, connector, onClose } = props;

  return (
    <Modal
      open
      onClose={onClose}
      title={
        connector
          ? locales.connector_edit
          : kind === 'destination'
            ? locales.connector_add_destination
            : locales.connector_add_channel
      }
    >
      <Box sx={{ width: 'min(520px, calc(100vw - 64px))' }}>
        <ConnectorForm {...props} />
      </Box>
    </Modal>
  );
}
