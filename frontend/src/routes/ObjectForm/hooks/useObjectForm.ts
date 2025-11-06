import api from '@/api';
import type { FormFieldType } from '@/api/tree/types';
import type { TabResponseType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import locales from '@/locales';
import { tools } from '@/core/utils';
import { useTreeStore } from '@/store/treeStore/tree.store';

export interface UseObjectFormParams {
  nodeId: string;
  action: string;
  enabled?: boolean;
  onSuccess?: () => void;
}

export interface UseObjectFormReturn {
  tabs: TabResponseType;
  selectedTabId: string | null;
  fields: FormFieldType[];
  formData: Record<string, any>;
  isLoading: boolean;
  isSaving: boolean;
  setSelectedTabId: (tabId: string) => void;
  updateField: (fieldId: string, value: any) => void;
  updateArrayField: (fieldId: string, value: any[]) => void;
  addArrayItem: (fieldId: string) => void;
  save: () => Promise<void>;
  cancel: () => void;
  refetch: () => void;
}

/**
 * Standalone hook for managing object form data
 * Works independently from tabStore
 */
export function useObjectForm({
  nodeId,
  action,
  enabled = true,
  onSuccess
}: UseObjectFormParams): UseObjectFormReturn {
  const currentConnection = useCurrentConnection();
  const queryClient = useQueryClient();
  const reloadTree = useTreeStore.getState().reloadTree;

  // Local state for form data
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [selectedTabId, setSelectedTabIdState] = useState<string | null>(null);

  // Fetch tabs
  const { data: tabs = [], refetch: refetchTabs } = useQuery({
    queryKey: ['objectFormTabs', nodeId, action, currentConnection?.id],
    queryFn: () =>
      api.tree.getTabs({
        nodeId,
        action,
        connectionId: currentConnection?.id || 0
      }),
    enabled: enabled && !!currentConnection?.id && !!nodeId && !!action
  });

  // Auto-select first tab
  const effectiveTabId = useMemo(() => {
    if (selectedTabId) return selectedTabId;
    if (tabs.length > 0) return tabs[0].id;
    return null;
  }, [selectedTabId, tabs]);

  // Fetch fields for selected tab
  const { data: fields = [], refetch: refetchFields } = useQuery({
    queryKey: ['objectFormFields', nodeId, action, effectiveTabId, currentConnection?.id],
    queryFn: () =>
      api.tree.getObject({
        nodeId,
        action,
        tabId: effectiveTabId!,
        connectionId: currentConnection?.id || 0
      }),
    enabled: enabled && !!currentConnection?.id && !!nodeId && !!action && !!effectiveTabId,
    select: (data: FormFieldType[]) => {
      return data.map((field) => ({
        ...field,
        originalValue: field.value
      }));
    }
  });

  // Initialize form data when fields change
  useEffect(() => {
    if (!effectiveTabId || !fields.length) return;

    setFormData((prev) => {
      // Only initialize if not already set
      if (prev[effectiveTabId]) return prev;

      const tabData: Record<string, any> = {};
      fields.forEach((field) => {
        if (field.type === 'array') {
          tabData[field.id] = field.value || [];
        } else {
          tabData[field.id] = field.value;
        }
      });

      return {
        ...prev,
        [effectiveTabId]: tabData
      };
    });
  }, [fields, effectiveTabId]);

  // Save mutation
  const { mutateAsync: executeAction, isPending: isSaving } = useMutation({
    mutationFn: api.tree.executeAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['objectFormTabs', nodeId, action, currentConnection?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['objectFormFields', nodeId, action, effectiveTabId, currentConnection?.id]
      });
      reloadTree(false);
      onSuccess?.();
      toast.success(locales.changes_saved_successfully);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to save changes');
    }
  });

  const setSelectedTabId = useCallback((tabId: string) => {
    setSelectedTabIdState(tabId);
  }, []);

  const updateField = useCallback(
    (fieldId: string, value: any) => {
      if (!effectiveTabId) return;

      setFormData((prev) => {
        const tabData = prev[effectiveTabId] || {};
        return {
          ...prev,
          [effectiveTabId]: {
            ...tabData,
            [fieldId]: value
          }
        };
      });
    },
    [effectiveTabId]
  );

  const updateArrayField = useCallback(
    (fieldId: string, value: any[]) => {
      if (!effectiveTabId) return;
      updateField(fieldId, value);
    },
    [effectiveTabId, updateField]
  );

  const addArrayItem = useCallback(
    (fieldId: string) => {
      if (!effectiveTabId) return;

      const field = fields.find((f) => f.id === fieldId);
      if (!field || field.type !== 'array' || !field.fields?.[0]) return;

      const template = field.fields[0];
      const newItem: Record<string, any> = {
        added: true
      };

      template.fields?.forEach((f: FormFieldType) => {
        newItem[f.id] = f.type === 'multi-select' ? [] : null;
      });

      const currentArray = formData[effectiveTabId]?.[fieldId] || [];
      updateArrayField(fieldId, [...currentArray, newItem]);
    },
    [effectiveTabId, fields, formData, updateArrayField]
  );

  const save = useCallback(async () => {
    if (!currentConnection?.id || !nodeId || !action || !effectiveTabId) return;

    // Build save format (same as useObjectActions)
    const saveData: Record<string, Record<string, any>> = {};

    Object.entries(formData).forEach(([tabId, tabData]) => {
      const tabFields = tabId === effectiveTabId ? fields : [];
      const tabSaveData: Record<string, any> = {};

      Object.entries(tabData).forEach(([fieldId, value]) => {
        const field = tabFields.find((f) => f.id === fieldId);
        if (!field) return;

        if (field.type === 'array') {
          const arrayData = (value as any[]).map((item, index) => {
            const originalItem = (field.value as any[])?.[index];
            const itemSave: any = {};

            if (item.deleted) {
              return { old: originalItem || {}, deleted: true };
            }

            field.fields?.forEach((subField) => {
              const itemValue = item[subField.id];
              const originalValue = originalItem?.[subField.id];

              if (item.added || itemValue !== originalValue) {
                if (!itemSave.new) itemSave.new = {};
                if (!itemSave.old) itemSave.old = {};

                if (item.added) {
                  itemSave.added = true;
                  itemSave.new[subField.id] = itemValue;
                } else if (itemValue !== originalValue) {
                  itemSave.new[subField.id] = itemValue;
                  itemSave.old[subField.id] = originalValue;
                }
              }
            });

            if (itemSave.new || itemSave.old || itemSave.deleted) {
              return itemSave;
            }
            return null;
          });

          const filteredArray = arrayData.filter((item) => item !== null);
          if (filteredArray.length > 0) {
            tabSaveData[fieldId] = filteredArray;
          }
        } else {
          const originalValue = field.originalValue ?? field.value;
          if (value !== originalValue) {
            if (!tabSaveData[fieldId]) {
              tabSaveData[fieldId] = { new: {}, old: {} };
            }
            tabSaveData[fieldId].new[fieldId] = value;
            tabSaveData[fieldId].old[fieldId] = originalValue;
          }
        }
      });

      if (Object.keys(tabSaveData).length > 0) {
        saveData[tabId] = tabSaveData;
      }
    });

    if (Object.keys(saveData).length === 0) {
      toast.info(locales.no_changes_detected);
      return;
    }

    await executeAction({
      nodeId,
      action,
      connectionId: currentConnection.id,
      data: saveData
    });
  }, [currentConnection, nodeId, action, effectiveTabId, formData, fields, executeAction]);

  const cancel = useCallback(() => {
    setFormData({});
    setSelectedTabIdState(null);
    refetchFields();
    toast.info('Changes discarded');
  }, [refetchFields]);

  const refetch = useCallback(() => {
    refetchTabs();
    refetchFields();
  }, [refetchTabs, refetchFields]);

  return {
    tabs,
    selectedTabId: effectiveTabId,
    fields,
    formData: formData[effectiveTabId || ''] || {},
    isLoading: false,
    isSaving,
    setSelectedTabId,
    updateField,
    updateArrayField,
    addArrayItem,
    save,
    cancel,
    refetch
  };
}

