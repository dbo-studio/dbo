import api from '@/api';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useFormObjectStore } from '@/store/formObject/formObject.store';
import { ObjectTabType } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

type UseFormDataReturn = {
  objectTabId: string;
  isLoading: boolean;
};

export const useFormData = (tabId: string | null): UseFormDataReturn => {
  const selectedTab = useSelectedTab<ObjectTabType>();
  const currentConnection = useCurrentConnection();
  const setFormObject = useFormObjectStore((state) => state.setFormObject);
  const getFormData = useFormObjectStore((state) => state.getFormData);

  const objectTabId = useMemo(() => {
    if (!tabId || !selectedTab?.id) return '';
    return `${selectedTab.id}_${tabId}`;
  }, [tabId, selectedTab?.id]);

  const { mutateAsync: formDataMutation, isPending } = useMutation({
    mutationFn: api.tree.getObject
  });

  useEffect(() => {
    void (async () => {
      if (!tabId || !selectedTab?.id || !objectTabId) return;
      const cachedData = getFormData(objectTabId);

      if (!cachedData) {
        const response = await formDataMutation({
          nodeId: selectedTab?.nodeId ?? '',
          action: selectedTab?.action ?? '',
          tabId: tabId ?? '',
          connectionId: currentConnection?.id ?? 0
        });

        setFormObject(objectTabId, response);
      }
    })();
  }, [tabId, selectedTab?.id, selectedTab?.nodeId, selectedTab?.action, objectTabId, currentConnection?.id]);

  return {
    isLoading: isPending,
    objectTabId
  };
};
