import PanelItem from '@/components/common/Panels/PanelItem/PanelItem.tsx';
import PanelTabs from '@/components/common/Panels/PanelTabs/PanelTabs.tsx';
import type { JSX } from 'react';

export default function Panels(): JSX.Element {
  return (
    <>
      <PanelTabs />
      <PanelItem />
    </>
  );
}
