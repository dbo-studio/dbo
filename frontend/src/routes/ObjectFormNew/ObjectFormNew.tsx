import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import type { FormFieldWithState } from '@/types/Tree';
import { Box, CircularProgress } from '@mui/material';
import React, { useCallback } from 'react';
import ArrayForm from './components/ArrayForm/ArrayForm';
import SimpleForm from './components/SimpleForm/SimpleForm';
import FormStatusBar from './components/StatusBar/FormStatusBar';
import FormTabs from './components/Tabs/FormTabs';
import { useFormActions } from './hooks/useFormActions';
import { useFormData } from './hooks/useFormData';
import { useTabs } from './hooks/useTabs';
import { ObjectFormNewStyled } from './ObjectFormNew.styled';
import type { FormValue } from './types';

export default function ObjectFormNew({ isDetail }: { isDetail: boolean }): React.JSX.Element {
  const { tabs, selectedTabId, isLoading: isLoadingTabs, handleTabChange } = useTabs();
  const formDataState = useFormData(selectedTabId, isDetail);
  const { handleSave, handleCancel, isLoading: isSaving } = useFormActions(selectedTabId);
  const selectedTab = useSelectedTab();
  const { updateFormData } = useDataStore();

  const handleFieldChange = useCallback(
    (fieldId: string, value: FormValue): void => {
      if (!selectedTab?.id || !selectedTabId || !formDataState) return;

      const storageKey = `${selectedTab.id}_${selectedTabId}`;
      const currentFields = useDataStore.getState().formDataByTab[selectedTab.id]?.[storageKey] as
        | FormFieldWithState[]
        | undefined;

      if (!currentFields) return;

      const updatedFields = currentFields.map((field) => (field.id === fieldId ? { ...field, value } : field));

      updateFormData(selectedTab.id, storageKey, updatedFields);
    },
    [selectedTab?.id, selectedTabId, formDataState, updateFormData]
  );

  const handleArrayDataChange = useCallback(
    (data: Record<string, FormValue>[]): void => {
      if (!selectedTab?.id || !selectedTabId || !formDataState) return;

      const storageKey = `${selectedTab.id}_${selectedTabId}`;
      const currentFields = useDataStore.getState().formDataByTab[selectedTab.id]?.[storageKey] as
        | FormFieldWithState[]
        | undefined;

      if (!currentFields) return;

      const updatedFields = currentFields.map((field) => ({
        ...field,
        value: data.map((row) => row[field.id] ?? null)
      }));

      updateFormData(selectedTab.id, storageKey, updatedFields);
    },
    [selectedTab?.id, selectedTabId, formDataState, updateFormData]
  );

  const handleAddRow = useCallback((): void => {
    if (!selectedTab?.id || !selectedTabId || !formDataState) return;

    const newRow: Record<string, FormValue> = {};
    formDataState.schema.forEach((field) => {
      newRow[field.id] = field.type === 'multi-select' ? [] : null;
    });

    const currentData = formDataState.data;
    handleArrayDataChange([...currentData, newRow]);
  }, [selectedTab?.id, selectedTabId, formDataState, handleArrayDataChange]);

  const handleSaveClick = useCallback(async (): Promise<void> => {
    if (!formDataState) return;
    await handleSave(formDataState);
  }, [formDataState, handleSave]);

  const showTabs = tabs.length > 0;
  const showLoading = isLoadingTabs || !formDataState;
  const showContent = !showLoading && formDataState;

  return (
    <ObjectFormNewStyled>
      {showTabs && <FormTabs tabs={tabs} selectedTabId={selectedTabId} onTabChange={handleTabChange} />}

      {showLoading && (
        <Box display='flex' justifyContent='center' alignItems='center' flex={1} minHeight={200}>
          <CircularProgress size={30} />
        </Box>
      )}

      {showContent && (
        <>
          <Box flex={1} overflow='auto' padding={1}>
            {formDataState.isArray ? (
              <ArrayForm schema={formDataState.schema} data={formDataState.data} onDataChange={handleArrayDataChange} />
            ) : (
              <SimpleForm schema={formDataState.schema} onFieldChange={handleFieldChange} />
            )}
          </Box>

          <FormStatusBar
            onSave={handleSaveClick}
            onCancel={handleCancel}
            onAddRow={formDataState.isArray ? handleAddRow : undefined}
            isArrayForm={formDataState.isArray}
            disabled={isSaving}
          />
        </>
      )}
    </ObjectFormNewStyled>
  );
}
