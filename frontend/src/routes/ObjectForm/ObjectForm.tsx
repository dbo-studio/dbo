import { useAiBridge } from '@/hooks/useAiBridge';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useFormObjectStore } from '@/store/formObject/formObject.store';
import { ObjectTabType } from '@/types';
import { CircularProgress, Stack } from '@mui/material';
import React, { useCallback } from 'react';
import ArrayForm from './components/ArrayForm/ArrayForm';
import GeneralForm from './components/GeneralForm/GeneralForm';
import QueryPreviewModal from './components/QueryPreviewModal/QueryPreviewModal';
import FormStatusBar from './components/StatusBar/FormStatusBar';
import FormTabs from './components/Tabs/FormTabs';
import { useFormData } from './hooks/useFormData';
import { useFormSave } from './hooks/useFormSave';
import { useTabs } from './hooks/useTabs';
import {
  buildObjectDefinitionSummary,
  parseObjectNodeId,
  readObjectNameFromForm
} from './utils/buildObjectDefinitionSummary';
import { prefetchObjectFormTabs } from './utils/prefetchObjectFormTabs';
import { ObjectFormContentStyled, ObjectFormLoadingStyled, ObjectFormStyled } from './ObjectForm.styled';

export default function ObjectForm(): React.JSX.Element {
  const { tabs, selectedTabId, isLoading: isLoadingTabs, handleTabChange } = useTabs();
  const { isLoading, objectTabId } = useFormData(selectedTabId);

  const addRow = useFormObjectStore((state) => state.addRow);
  const selectedTab = useSelectedTab<ObjectTabType>();
  const currentConnection = useCurrentConnection();
  const { prefillChat } = useAiBridge();

  const formData = useFormObjectStore((state) => state.getFormData(objectTabId));
  const showGeneralForm = (formData?.general.length ?? 0) > 0;
  const showArrayForm = (formData?.schema.length ?? 0) > 0;

  const handleAiSuggest = useCallback(async (): Promise<void> => {
    if (!selectedTab?.id || !currentConnection?.id) return;

    const formDataByTab = await prefetchObjectFormTabs(selectedTab, tabs, currentConnection.id);
    const objectDefinition = buildObjectDefinitionSummary(formDataByTab, selectedTab.id, tabs, selectedTab.action);

    if (!objectDefinition.trim()) return;

    const nodeContext = parseObjectNodeId(selectedTab.nodeId);
    const objectName = nodeContext.objectName ?? readObjectNameFromForm(formDataByTab);
    const isViewAction = selectedTab.action === 'createView' || selectedTab.action === 'editView';
    const isCreateAction = selectedTab.action?.startsWith('create') ?? false;

    prefillChat('Suggest improvements for this object definition.', true, {
      database: nodeContext.database,
      schema: nodeContext.schema,
      tables: !isViewAction && objectName && !isCreateAction ? [objectName] : [],
      views: isViewAction && objectName && !isCreateAction ? [objectName] : [],
      objectDefinition,
      queryResultSummary: undefined,
      querySnippet: undefined,
      selectedQuery: undefined
    });
  }, [currentConnection?.id, prefillChat, selectedTab, tabs]);

  const { handleSave, handleCancel, handleConfirmExecute, handleClosePreview, isSaving, previewState } = useFormSave({
    tabs: tabs as ObjectTabType[],
    objectTabId
  });

  return (
    <ObjectFormStyled
      data-testid='object-form'
      data-object-tab-id={objectTabId}
      data-workspace-tab-id={selectedTab?.id ?? ''}
    >
      {!isLoading && tabs.length > 0 && (
        <FormTabs tabs={tabs} selectedTabId={selectedTabId} onTabChange={handleTabChange} />
      )}
      {(isLoadingTabs || isLoading) && (
        <ObjectFormLoadingStyled>
          <CircularProgress size={30} />
        </ObjectFormLoadingStyled>
      )}
      {!isLoadingTabs && !isLoading && (
        <ObjectFormContentStyled>
          {showGeneralForm && <GeneralForm objectTabId={objectTabId} />}
          {showArrayForm && (
            <Stack
              direction={'column'}
              sx={{
                flex: 1,
                overflow: 'auto'
              }}
            >
              <ArrayForm objectTabId={objectTabId} />
            </Stack>
          )}

          <FormStatusBar
            onSave={() => void handleSave()}
            onCancel={() => void handleCancel()}
            onAddRow={showArrayForm ? () => addRow(objectTabId) : undefined}
            onAiSuggest={() => void handleAiSuggest()}
            isArrayForm={showArrayForm}
            disabled={isSaving}
          />
        </ObjectFormContentStyled>
      )}
      <QueryPreviewModal
        open={previewState.isOpen}
        queries={previewState.queries}
        isExecuting={previewState.isExecuting}
        onCancel={handleClosePreview}
        onConfirm={() => void handleConfirmExecute()}
      />
    </ObjectFormStyled>
  );
}
