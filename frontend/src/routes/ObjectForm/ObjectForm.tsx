import { useFormObjectStore } from '@/store/formObject/formObject.store';
import { ObjectTabType } from '@/types';
import { Box, CircularProgress, Stack } from '@mui/material';
import React from 'react';
import ArrayForm from './components/ArrayForm/ArrayForm';
import GeneralForm from './components/GeneralForm/GeneralForm';
import QueryPreviewModal from './components/QueryPreviewModal/QueryPreviewModal';
import FormStatusBar from './components/StatusBar/FormStatusBar';
import FormTabs from './components/Tabs/FormTabs';
import { useFormData } from './hooks/useFormData';
import { useFormSave } from './hooks/useFormSave';
import { useTabs } from './hooks/useTabs';
import { ObjectFormStyled } from './ObjectForm.styled';

export default function ObjectForm(): React.JSX.Element {
  const { tabs, selectedTabId, isLoading: isLoadingTabs, handleTabChange } = useTabs();
  const { isLoading, objectTabId } = useFormData(selectedTabId);

  const addRow = useFormObjectStore((state) => state.addRow);

  const isArrayTab = selectedTabId !== 'view' && selectedTabId !== null;

  const { handleSave, handleCancel, handleConfirmExecute, handleClosePreview, isSaving, previewState } = useFormSave({
    tabs: tabs as ObjectTabType[],
    objectTabId
  });

  return (
    <ObjectFormStyled>
      {!isLoading && tabs.length > 0 && (
        <FormTabs tabs={tabs} selectedTabId={selectedTabId} onTabChange={handleTabChange} />
      )}

      {(isLoadingTabs || isLoading) && (
        <Box display='flex' justifyContent='center' alignItems='center' flex={1} minHeight={200}>
          <CircularProgress size={30} />
        </Box>
      )}

      {!isLoadingTabs && !isLoading && (
        <Box overflow={'hidden'} flexDirection={'column'} display={'flex'} width={'100%'}>
          <GeneralForm objectTabId={objectTabId} />
          <Stack flex={1} overflow='auto' direction={'column'}>
            <ArrayForm objectTabId={objectTabId} />
          </Stack>

          <FormStatusBar
            onSave={() => void handleSave()}
            onCancel={() => void handleCancel()}
            onAddRow={isArrayTab ? () => addRow(objectTabId) : undefined}
            isArrayForm={isArrayTab}
            disabled={isSaving}
          />
        </Box>
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
