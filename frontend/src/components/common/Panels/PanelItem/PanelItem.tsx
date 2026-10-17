'use no memo';

import EmptyState from '@/components/base/EmptyState/EmptyState';
import Settings from '@/components/common/Settings/Settings';
import { canCreateConnection } from '@/core/auth/permissions';
import { TabMode } from '@/core/enums';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Button } from '@mui/material';
import Data from '@/routes/Data/Data';
import ObjectForm from '@/routes/ObjectForm/ObjectForm';
import Query from '@/routes/Query/Query';
import { type JSX, lazy, Suspense } from 'react';
import { PanelItemStyled } from './PanelItem.styled';

// Diagrams pull in the whole xyflow bundle; load it only when a diagram tab is opened.
const Diagram = lazy(() => import('@/routes/Diagram/Diagram'));

export default function PanelItem(): JSX.Element {
  const selectedTab = useSelectedTab();
  const connection = useCurrentConnection();
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const updateUI = useSettingStore((state) => state.updateUI);
  const mode = useAuthStore((state) => state.mode);
  const user = useAuthStore((state) => state.user);

  if (!selectedTab && !connection) {
    return (
      <PanelItemStyled>
        <EmptyState
          icon='connection'
          title={locales.no_active_connection}
          description={locales.connections_empty_hint}
          action={
            canCreateConnection(mode, user) ? (
              <Button
                variant='contained'
                onClick={(): void => updateUI({ showAddConnection: true, duplicateConnectionId: undefined })}
              >
                {locales.new_connection}
              </Button>
            ) : undefined
          }
        />
      </PanelItemStyled>
    );
  }

  if (!selectedTab) {
    return (
      <PanelItemStyled>
        <EmptyState
          icon='code'
          title={locales.workspace_empty_title}
          description={locales.workspace_empty_description}
          action={
            <Button variant='contained' onClick={(): void => void addEditorTab()}>
              {locales.open_editor}
            </Button>
          }
        />
      </PanelItemStyled>
    );
  }

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
