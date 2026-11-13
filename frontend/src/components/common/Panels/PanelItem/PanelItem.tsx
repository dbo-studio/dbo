'use no memo';

import ConnectionStarter from '@/components/common/Connections/ConnectionStarter';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import WorkspaceEmpty from '../WorkspaceEmpty/WorkspaceEmpty';
import Backup from '@/routes/Backup/Backup';
import Settings from '@/components/common/Settings/Settings';
import { isMongoDriver } from '@/core/db/connectionAliases';
import { TabMode } from '@/core/enums';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import Question from '@/routes/Question/Question';
import Dashboard from '@/routes/Dashboard/Dashboard';
import Browse from '@/routes/Browse/Browse';
import Tool from '@/routes/Tool/Tool';
import Data from '@/routes/Data/Data';
import ObjectForm from '@/routes/ObjectForm/ObjectForm';
import MongoQuery from '@/routes/Query/MongoQuery/MongoQuery';
import Query from '@/routes/Query/Query';
import { type JSX, lazy, Suspense } from 'react';
import { PanelItemStyled } from './PanelItem.styled';

// Diagrams pull in the whole xyflow bundle; load it only when a diagram tab is opened.
const Diagram = lazy(() => import('@/routes/Diagram/Diagram'));

export default function PanelItem(): JSX.Element {
  const selectedTab = useSelectedTab();
  const connection = useCurrentConnection();

  if (!selectedTab && !connection) {
    return (
      <PanelItemStyled>
        <EmptyState
          icon='connection'
          title={locales.no_active_connection}
          description={locales.connections_empty_hint}
          action={<ConnectionStarter />}
        />
      </PanelItemStyled>
    );
  }

  if (!selectedTab) {
    return (
      <PanelItemStyled>
        <WorkspaceEmpty />
      </PanelItemStyled>
    );
  }

  return (
    <PanelItemStyled>
      {selectedTab
        ? (selectedTab.mode === TabMode.Data && <Data />) ||
          (selectedTab.mode === TabMode.Query && (isMongoDriver(connection?.type) ? <MongoQuery /> : <Query />)) ||
          (selectedTab.mode === TabMode.Object && <ObjectForm />) ||
          (selectedTab.mode === TabMode.ObjectDetail && <ObjectForm />) ||
          (selectedTab.mode === TabMode.Diagram && (
            <Suspense fallback={null}>
              <Diagram />
            </Suspense>
          )) ||
          (selectedTab.mode === TabMode.Dashboard && <Dashboard />) ||
          (selectedTab.mode === TabMode.Question && <Question />) ||
          (selectedTab.mode === TabMode.Settings && <Settings />) ||
          (selectedTab.mode === TabMode.Backup && <Backup />) ||
          (selectedTab.mode === TabMode.Browse && <Browse key={selectedTab.id} />) ||
          (selectedTab.mode === TabMode.Tool && <Tool />)
        : null}
    </PanelItemStyled>
  );
}
