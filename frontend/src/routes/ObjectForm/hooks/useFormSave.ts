import api from '@/api';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useFormObjectStore } from '@/store/formObject/formObject.store';
import { FormObjectData } from '@/store/formObject/types';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { ObjectTabType } from '@/types';
import { FormValue } from '@/types/Tree';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { buildSavePayload } from '../utils/buildSavePayload';

type UseFormSaveParams = {
  tabs: ObjectTabType[];
  objectTabId: string;
};

type PreviewState = {
  isOpen: boolean;
  queries: string[];
  pendingPayload: Record<string, unknown> | null;
};

export const useFormSave = ({
  tabs
}: UseFormSaveParams): {
  handleSave: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleConfirmExecute: () => Promise<void>;
  handleClosePreview: () => void;
  isSaving: boolean;
  previewState: PreviewState & { isExecuting: boolean };
} => {
  const currentConnection = useCurrentConnection();
  const selectedTab = useSelectedTab<ObjectTabType>();
  const { reloadTree } = useTreeStore();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const getFormData = useFormObjectStore((state) => state.getFormData);
  const setFormObject = useFormObjectStore((state) => state.setFormObject);
  const commitAllTabs = useFormObjectStore((state) => state.commitAllTabs);
  const clearTabsByPrefix = useFormObjectStore((state) => state.clearTabsByPrefix);

  const [previewState, setPreviewState] = useState<PreviewState>({
    isOpen: false,
    queries: [],
    pendingPayload: null
  });

  const { mutateAsync: getObject } = useMutation({ mutationFn: api.tree.getObject });
  const { mutateAsync: previewExecute, isPending: isPreviewing } = useMutation({
    mutationFn: api.tree.previewExecute
  });
  const { mutateAsync: executeAction, isPending: isExecuting } = useMutation({
    mutationFn: api.tree.executeAction
  });

  const prefetchTabs = useCallback(async (): Promise<Record<string, FormObjectData>> => {
    if (!selectedTab?.id || !currentConnection) return {};

    const formDataByTab: Record<string, FormObjectData> = {};

    for (const tab of tabs) {
      const tabKey = `${selectedTab.id}_${tab.id}`;
      let formData = getFormData(tabKey);

      if (!formData) {
        const response = await getObject({
          nodeId: selectedTab.nodeId,
          action: selectedTab.action ?? '',
          tabId: tab.id,
          connectionId: currentConnection.id
        });
        setFormObject(tabKey, response);
        formData = useFormObjectStore.getState().getFormData(tabKey);
      }

      if (formData) {
        formDataByTab[tabKey] = formData;
      }
    }

    return formDataByTab;
  }, [selectedTab, currentConnection, tabs, getFormData, getObject, setFormObject]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!currentConnection || !selectedTab?.id || isPreviewing || isExecuting) return;

    try {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const formDataByTab = await prefetchTabs();
      const payload = buildSavePayload(formDataByTab, tabs, selectedTab.action ?? '', selectedTab.id);

      if (!payload) {
        toast.info(locales.no_changes_detected);
        return;
      }

      const { queries } = await previewExecute({
        nodeId: selectedTab.nodeId,
        action: selectedTab.action ?? '',
        connectionId: currentConnection.id,
        data: payload as Record<string, FormValue>
      });

      setPreviewState({
        isOpen: true,
        queries,
        pendingPayload: payload
      });
    } catch (error) {
      console.error('Save preview error:', error);
      toast.error(locales.preview_failed);
    }
  }, [currentConnection, selectedTab, isPreviewing, isExecuting, prefetchTabs, tabs, previewExecute]);

  const handleConfirmExecute = useCallback(async (): Promise<void> => {
    if (!currentConnection || !selectedTab?.id || !previewState.pendingPayload || isExecuting) return;

    const payload = previewState.pendingPayload;
    const action = selectedTab.action ?? '';

    try {
      const result = await withSafeModeRetry((confirmed) =>
        executeAction({
          nodeId: selectedTab.nodeId,
          action,
          connectionId: currentConnection.id,
          data: payload as Record<string, FormValue>,
          confirmed
        })
      );
      if (result === undefined) {
        return;
      }

      const newNodeId = result.nodeId;
      const objectTabStoreId = selectedTab.id;

      if (newNodeId) {
        clearTabsByPrefix(objectTabStoreId);

        const nextAction = result.nextAction || action;
        const displayName = newNodeId.includes('.') ? (newNodeId.split('.').pop() ?? newNodeId) : newNodeId;

        updateSelectedTab({
          ...selectedTab,
          nodeId: newNodeId,
          name: displayName,
          action: nextAction
        });

        for (const tab of tabs) {
          const tabKey = `${objectTabStoreId}_${tab.id}`;
          const response = await getObject({
            nodeId: newNodeId,
            action: nextAction,
            tabId: tab.id,
            connectionId: currentConnection.id
          });
          setFormObject(tabKey, response);
        }
      } else {
        commitAllTabs(objectTabStoreId);
      }

      await reloadTree(false);

      setPreviewState({ isOpen: false, queries: [], pendingPayload: null });
      toast.success(locales.changes_saved_successfully);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(locales.save_failed);
    }
  }, [
    currentConnection,
    selectedTab,
    previewState.pendingPayload,
    isExecuting,
    executeAction,
    commitAllTabs,
    clearTabsByPrefix,
    updateSelectedTab,
    tabs,
    getObject,
    setFormObject,
    reloadTree
  ]);

  const handleClosePreview = useCallback((): void => {
    if (isExecuting) return;
    setPreviewState({ isOpen: false, queries: [], pendingPayload: null });
  }, [isExecuting]);

  const handleCancel = useCallback(async (): Promise<void> => {
    if (!selectedTab?.id || !currentConnection) return;

    try {
      for (const tab of tabs) {
        const tabKey = `${selectedTab.id}_${tab.id}`;
        const response = await getObject({
          nodeId: selectedTab.nodeId,
          action: selectedTab.action ?? '',
          tabId: tab.id,
          connectionId: currentConnection.id
        });
        setFormObject(tabKey, response);
      }

      toast.info(locales.changes_discarded);
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(locales.discard_failed);
    }
  }, [selectedTab, currentConnection, tabs, getObject, setFormObject]);

  return {
    handleSave,
    handleCancel,
    handleConfirmExecute,
    handleClosePreview,
    isSaving: isPreviewing || isExecuting,
    previewState: {
      ...previewState,
      isExecuting
    }
  };
};
