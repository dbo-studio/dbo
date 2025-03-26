import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

export const useObjectFields = (currentTabId: string | undefined, isDetail = false) => {
  const { getSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);
  const { currentConnection } = useConnectionStore();
  const { getFormData, resetFormData, updateFormData } = useDataStore();

  const { data: fields } = useQuery({
    queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, selectedTab?.options?.action, currentTabId],
    queryFn: () =>
      isDetail
        ? api.tree.getObject({
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action,
            tabId: currentTabId || '',
            connectionId: currentConnection?.id || 0
          })
        : api.tree.getFields({
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action,
            tabId: currentTabId || '',
            connectionId: currentConnection?.id || 0
          }),
    enabled: !!(
      currentConnection?.id &&
      selectedTab?.id &&
      selectedTab?.options?.action &&
      currentTabId &&
      selectedTab?.nodeId
    ),
    select: (data) => {
      return data.map((field) => ({
        ...field,
        originalValue: field.value
      }));
    }
  });

  const getTabId = () => {
    return currentTabId || '';
  };

  const resetForm = () => {
    if (!currentTabId) return;
    resetFormData(selectedTab?.id ?? '', getTabId());
  };

  // Initialize or update form data when fields change from the server
  useEffect(() => {
    if (fields && currentTabId) {
      const formData = getFormData(selectedTab?.id ?? '', getTabId());
      // Only initialize if no form data exists for this tab
      if (!formData) {
        const initialFields = fields.map((field) => ({
          ...field,
          value: field.originalValue
        }));
        updateFormData(selectedTab?.id ?? '', getTabId(), initialFields);
      }
    }
  }, [fields, currentTabId, getFormData, getTabId, updateFormData]);

  const currentFields = useMemo(() => {
    if (!fields || !currentTabId) return null;

    const formData = getFormData(selectedTab?.id ?? '', getTabId());
    if (formData) {
      return formData;
    }

    return fields.map((field) => ({
      ...field,
      value: field.originalValue
    }));
  }, [fields, currentTabId, getFormData, getTabId]);

  return {
    fields: currentFields,
    resetForm
  };
};
