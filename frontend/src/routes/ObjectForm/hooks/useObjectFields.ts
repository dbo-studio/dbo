import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export const useObjectFields = (currentTabId: string | undefined, isDetail = false) => {
  const { getSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);
  const { currentConnection } = useConnectionStore();
  const { getFormData, resetFormData } = useDataStore();

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

  const getAction = () => {
    return selectedTab?.options?.action || '';
  };

  const resetForm = () => {
    if (!currentTabId) return;
    resetFormData(getTabId(), getAction());
  };

  const currentFields = useMemo(() => {
    if (!fields || !currentTabId) return null;

    const formData = getFormData(getTabId(), getAction());
    if (formData) {
      return formData;
    }

    return fields.map((field) => ({
      ...field,
      value: field.originalValue
    }));
  }, [fields, currentTabId, getFormData, getTabId, getAction]);

  return {
    fields: currentFields,
    resetForm
  };
};
