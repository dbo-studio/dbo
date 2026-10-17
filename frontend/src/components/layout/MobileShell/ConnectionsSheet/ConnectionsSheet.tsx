import BottomSheet from '@/components/base/BottomSheet/BottomSheet';
import MobileConnectionList from '@/components/common/Connections/MobileConnectionList/MobileConnectionList';
import locales from '@/locales';
import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import type { JSX } from 'react';

/** Connection switcher opened from the header. */
export default function ConnectionsSheet(): JSX.Element {
  const open = useMobileNavStore((state) => state.connectionsOpen);
  const setConnectionsOpen = useMobileNavStore((state) => state.setConnectionsOpen);
  const setActiveTab = useMobileNavStore((state) => state.setActiveTab);

  const handleOpenCurrent = (): void => {
    setConnectionsOpen(false);
    setActiveTab('explore');
  };

  return (
    <BottomSheet open={open} onClose={(): void => setConnectionsOpen(false)} title={locales.connections}>
      <MobileConnectionList onOpenCurrent={handleOpenCurrent} />
    </BottomSheet>
  );
}
