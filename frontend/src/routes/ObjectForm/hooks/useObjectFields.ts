import api from '@/api';
import type { FormFieldType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

export const useObjectFields = (
  isDetail = false
): {
  fields: FormFieldType[];
} => {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();

  const getFormData = useDataStore((state) => state.getFormData);
  const updateFormData = useDataStore((state) => state.updateFormData);

  const { data: fields } = useQuery({
    queryKey: [
      'tabFields',
      currentConnection?.id,
      selectedTab?.id,
      selectedTab?.options?.action,
      selectedTab?.options?.tabId
    ],
    queryFn: (): Promise<FormFieldType[]> =>
      isDetail
        ? api.tree.getObject({
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action,
            tabId: selectedTab?.options?.tabId || '',
            connectionId: currentConnection?.id || 0
          })
        : api.tree.getFields({
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
    ),
    select: (data): FormFieldType[] => {
      return data.map((field) => ({
        ...field,
        originalValue: field.value
      }));
    }
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
