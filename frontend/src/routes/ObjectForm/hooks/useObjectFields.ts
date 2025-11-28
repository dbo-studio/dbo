import api from '@/api';
import { FormObjectResponseType, FormSchemaResponseType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import type { FormFieldType } from '@/types/Tree';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

export const useObjectFields = (
  isDetail: boolean
): {
  fields: FormFieldType[];
  isLoading: boolean;
} => {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();

  const { getFormData, updateFormData } = useDataStore();

  const { data: formResponse } = useQuery({
    queryKey: [
      'tabFields',
      currentConnection?.id,
      selectedTab?.id,
      selectedTab?.options?.action,
      selectedTab?.options?.tabId
    ],
    queryFn: (): Promise<FormObjectResponseType | FormSchemaResponseType> =>
      isDetail
        ? api.tree.getObject({
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action,
            tabId: selectedTab?.options?.tabId || '',
            connectionId: currentConnection?.id || 0
          })
        : api.tree.getSchema({
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action,
            tabId: selectedTab?.options?.tabId || '',
            connectionId: currentConnection?.id || 0
          }),
    enabled: !!(
      currentConnection?.id &&
      selectedTab?.id &&
      selectedTab?.options?.action &&
      selectedTab?.options?.tabId &&
      selectedTab?.nodeId
    )
  });

  const getTabId = (): string => {
    return selectedTab?.options?.tabId || '';
  };

  useEffect(() => {
    if (fields && selectedTab?.options?.tabId) {
      const formData = getFormData(selectedTab?.id ?? '', getTabId());

      if (!formData) {
        const initialFields = fields.map((field) => ({
          ...field,
          value: field.originalValue
        }));
        updateFormData(selectedTab?.id ?? '', getTabId(), initialFields);
      }
    }
  }, [fields, selectedTab?.options?.tabId, getFormData, getTabId, updateFormData]);

  const currentFields = useMemo(() => {
    if (!fields || !selectedTab?.options?.tabId) return null;

    const formData = getFormData(selectedTab?.id ?? '', getTabId());
    if (formData) {
      return formData;
    }

    return fields.map((field) => ({
      ...field,
      value: field.originalValue
    }));
  }, [fields, selectedTab?.options?.tabId, getFormData, getTabId]);

  return {
    fields: currentFields ?? []
  };
};
