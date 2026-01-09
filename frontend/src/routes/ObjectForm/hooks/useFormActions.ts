import api from '@/api';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { ObjectTabType } from '@/types';
import type { FormFieldWithState, FormValue } from '@/types/Tree';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { FormDataState } from '../types';

export const useFormActions = (
  tabId: string | null
): {
  handleSave: (formState: FormDataState) => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
} => {
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const selectedTab = useSelectedTab<ObjectTabType>();
  const { getFormData, resetFormData, updateFormData } = useDataStore();
  const { reloadTree } = useTreeStore();

  const { mutateAsync: executeAction, isPending } = useMutation({
    mutationFn: api.tree.executeAction,
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['formData', currentConnection?.id, selectedTab?.id, selectedTab?.action, tabId]
      });
      reloadTree(false);
    }
  });

  const buildSavePayload = useCallback(
    (
      currentFields: FormFieldWithState[],
      originalData: Record<string, FormValue>[] | undefined,
      isArray: boolean,
      tabId: string
    ): Record<string, unknown> | null => {
      if (isArray) {
        const originalRows = originalData ?? [];

        const currentRows: Record<string, FormValue>[] = [];
        if (currentFields.length > 0) {
          const firstField = currentFields[0];
          if (Array.isArray(firstField.value)) {
            firstField.value.forEach((_, rowIndex: number) => {
              const row: Record<string, FormValue> = {};
              currentFields.forEach((field) => {
                if (Array.isArray(field.value)) {
                  row[field.id] = field.value[rowIndex] ?? null;
                }
              });
              currentRows.push(row);
            });
          }
        }

        const columns: Array<Record<string, unknown>> = [];

        currentRows.forEach((currentRow, index) => {
          const originalRow = originalRows[index];

          if (!originalRow) {
            columns.push({ New: currentRow, Old: {}, Added: true });
          } else {
            const hasChanges = JSON.stringify(currentRow) !== JSON.stringify(originalRow);
            if (hasChanges) {
              columns.push({ New: currentRow, Old: originalRow });
            }
          }
        });

        originalRows.forEach((originalRow, index) => {
          if (index >= currentRows.length) {
            columns.push({ New: originalRow, Old: originalRow, Deleted: true });
          }
        });

        return columns.length > 0 ? { [tabId]: { Columns: columns } } : null;
      }

      const newData: Record<string, FormValue> = {};
      const oldData: Record<string, FormValue> = {};

      const originalDataObj = originalData?.[0] ?? {};

      currentFields.forEach((field) => {
        const currentValue = field.value;
        const originalValue = field.originalValue ?? originalDataObj[field.id] ?? null;

        const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(originalValue);

        if (hasChanged) {
          newData[field.id] = currentValue;
        }

        oldData[field.id] = originalValue;
      });

      const hasChanges = Object.keys(newData).length > 0;

      return hasChanges ? { [tabId]: { new: newData, old: oldData } } : null;
    },
    []
  );

  const handleSave = useCallback(
    async (formState: FormDataState): Promise<void> => {
      if (!currentConnection || !selectedTab || !tabId || isPending) return;

      try {
        const storageKey = `${selectedTab.id}_${tabId}`;
        const currentFields = getFormData(selectedTab.id, storageKey) as FormFieldWithState[] | undefined;

        if (!currentFields || currentFields.length === 0) {
          toast.info(locales.no_changes_detected);
          return;
        }

        const payload = buildSavePayload(currentFields, formState.originalData, formState.isArray, tabId);

        if (!payload || Object.keys(payload).length === 0) {
          toast.info(locales.no_changes_detected);
          return;
        }

        await executeAction({
          nodeId: selectedTab.nodeId,
          action: selectedTab?.action ?? '',
          connectionId: currentConnection.id,
          data: payload as Record<string, FormValue>
        });

        toast.success(locales.changes_saved_successfully);

        const updatedFields = currentFields.map((field) => ({
          ...field,
          originalValue: field.value
        }));
        updateFormData(selectedTab.id, storageKey, updatedFields);
      } catch (error) {
        console.error('Save error:', error);
        toast.error('Failed to save changes');
      }
    },
    [currentConnection, selectedTab, tabId, isPending, getFormData, buildSavePayload, executeAction, updateFormData]
  );

  const handleCancel = useCallback((): void => {
    if (!selectedTab || !tabId) return;

    const storageKey = `${selectedTab.id}_${tabId}`;
    resetFormData(selectedTab.id, storageKey);

    queryClient.refetchQueries({
      queryKey: ['formData', currentConnection?.id, selectedTab.id, selectedTab?.action, tabId]
    });

    toast.info('Changes discarded');
  }, [selectedTab, tabId, resetFormData, queryClient, currentConnection?.id]);

  return {
    handleSave,
    handleCancel,
    isLoading: isPending
  };
};
