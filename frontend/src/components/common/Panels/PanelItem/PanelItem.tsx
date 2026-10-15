'use no memo';

import Settings from '@/components/common/Settings/Settings';
import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks';
import Data from '@/routes/Data/Data';
import ObjectForm from '@/routes/ObjectForm/ObjectForm';
import Query from '@/routes/Query/Query';
import { type JSX, lazy, Suspense } from 'react';
import { PanelItemStyled } from './PanelItem.styled';

// Diagrams pull in the whole xyflow bundle; load it only when a diagram tab is opened.
const Diagram = lazy(() => import('@/routes/Diagram/Diagram'));

export default function PanelItem(): JSX.Element {
  const selectedTab = useSelectedTab();
  if (!selectedTab) return <></>;

  return (
    <PanelItemStyled>
      {selectedTab
        ? (selectedTab.mode === TabMode.Data && <Data />) ||
          (selectedTab.mode === TabMode.Query && <Query />) ||
          (selectedTab.mode === TabMode.Object && <ObjectForm />) ||
          (selectedTab.mode === TabMode.ObjectDetail && <ObjectForm />) ||
          (selectedTab.mode === TabMode.Diagram && (
            <Suspense fallback={null}>
              <Diagram />
            </Suspense>
          )) ||
          (selectedTab.mode === TabMode.Settings && <Settings />)
        : null}
    </PanelItemStyled>
  );
}
