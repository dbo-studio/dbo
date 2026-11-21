import { useCommandPaletteStore } from '@/store/commandPalette/commandPalette.store';
import { Modal } from '@mui/material';
import type { JSX } from 'react';
import PaletteBody from './PaletteBody/PaletteBody';

/** Search everything and run anything from one place. */
export default function CommandPalette(): JSX.Element | null {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);

  if (!open) return null;

  return (
    <Modal open onClose={() => setOpen(false)}>
      <PaletteBody onClose={() => setOpen(false)} />
    </Modal>
  );
}