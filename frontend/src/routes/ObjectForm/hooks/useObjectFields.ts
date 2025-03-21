import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

export const useObjectFields = (currentTabId: string | undefined, isDetail = false) => {
  const { getSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);
  const [formDataByTab, setFormDataByTab] = useState<Record<string, any>>({});
  const { currentConnection } = useConnectionStore();

  const { data: fields } = useQuery({
    queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, selectedTab?.options?.action, currentTabId],
    queryFn: () =>
      isDetail
        ? api.tree.getObject({
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action,
            tabId: currentTabId || '',
            connectionId: String(currentConnection?.id || '')
          })
        : api.tree.getFields({
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action,
            tabId: currentTabId || '',
            connectionId: String(currentConnection?.id || '')
          }),
    enabled: !!currentConnection && !!currentTabId,
    select: (data) => {
      return data.map((field) => ({
        ...field,
        originalValue: field.value
      }));
    }
  });

  const handleFormChange = (data: any) => {
    if (!currentTabId || !fields) return;

    const updatedFields = fields.map((field) => {
      if (field.type === 'array') {
        return {
          ...field,
          fields: data[field.id]
        };
      }
      return {
        ...field,
        value: data[field.id]
      };
    });

    setFormDataByTab((prev) => ({
      ...prev,
      [currentTabId]: updatedFields
    }));
  };

  const resetForm = () => {
    if (!currentTabId) return;
    setFormDataByTab((prev) => {
      const newState = { ...prev };
      delete newState[currentTabId];
      return newState;
    });
  };

  const currentFields = useMemo(() => {
    if (!fields || !currentTabId) return null;
    return formDataByTab[currentTabId] || fields;
  }, [fields, currentTabId, formDataByTab]);

  return {
    fields: currentFields,
    handleFormChange,
    resetForm
  };
};
