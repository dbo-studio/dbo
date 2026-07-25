import api from '@/api';
import type { TabResponseType } from '@/api/tree/types';
import { useFormObjectStore } from '@/store/formObject/formObject.store';
import type { FormObjectData } from '@/store/formObject/types';
import type { ObjectTabType } from '@/types';

export const prefetchObjectFormTabs = async (
  selectedTab: ObjectTabType,
  tabs: TabResponseType,
  connectionId: number
): Promise<Record<string, FormObjectData>> => {
  const formDataByTab: Record<string, FormObjectData> = {};
  const getFormData = useFormObjectStore.getState().getFormData;
  const setFormObject = useFormObjectStore.getState().setFormObject;

  for (const tab of tabs) {
    const tabKey = `${selectedTab.id}_${tab.id}`;
    let formData = getFormData(tabKey);

    if (!formData) {
      const response = await api.tree.getObject({
        nodeId: selectedTab.nodeId,
        action: selectedTab.action ?? '',
        tabId: tab.id,
        connectionId
      });
      setFormObject(tabKey, response);
      formData = useFormObjectStore.getState().getFormData(tabKey);
    }

    if (formData) {
      formDataByTab[tabKey] = formData;
    }
  }

  return formDataByTab;
};
