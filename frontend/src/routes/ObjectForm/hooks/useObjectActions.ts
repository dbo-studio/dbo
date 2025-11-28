import api from '@/api';
import type { FormFieldSchema, FormFieldType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useObjectActions = (): {
  handleSave: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleAddArrayItem: (field: FormFieldType) => void;
  handleUpdateArrayData: (fieldId: string, updatedField: FormFieldType) => void;
  handleFieldChange: (fieldId: string, value: any) => void;
} => {
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const selectedTab = useSelectedTab();

  const action = selectedTab?.options?.action || '';
  const tabId = selectedTab?.options?.tabId || '';

  const updateFormData = useDataStore((state) => state.updateFormData);
  const resetFormData = useDataStore((state) => state.resetFormData);
  const reloadTree = useTreeStore.getState().reloadTree;

  const { mutateAsync: executeAction, isPending: pendingExecuteAction } = useMutation({
    mutationFn: api.tree.executeAction,
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, action, tabId]
      });
      reloadTree(false);
    }
  });

  const handleSave = async (): Promise<void> => {
    if (!currentConnection || !selectedTab || pendingExecuteAction) return;

    try {
      const currentData = useDataStore.getState().formDataByTab?.[selectedTab.id]?.[tabId];
      const originalData = useDataStore.getState().formDataByTab?.[selectedTab.id]?.[`${tabId}_original`];

      if (!currentData || currentData.length === 0) {
        toast.info(locales.no_changes_detected);
        return;
      }

      // Build payload for backend
      const payload = buildSavePayload(currentData, originalData || [], tabId);

      if (!payload || Object.keys(payload).length === 0) {
        toast.info(locales.no_changes_detected);
        return;
      }

      await executeAction({
        nodeId: selectedTab.nodeId,
        action: selectedTab.options?.action || '',
        connectionId: currentConnection.id,
        data: payload
      });

      toast.success(locales.changes_saved_successfully);

      // Update original data after successful save
      updateFormData(selectedTab.id, `${tabId}_original`, JSON.parse(JSON.stringify(currentData)));
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes');
    }
  };

  // Helper to build backend payload format
  const buildSavePayload = (
    currentData: FormFieldType[],
    originalData: FormFieldType[],
    tabId: string
  ): Record<string, any> | null => {
    const arrayField = currentData.find((f) => f.metadata?.isArray && f.id === 'data');

    if (arrayField?.fields) {
      // Array form (e.g., Columns, Foreign Keys)
      const originalArrayField = originalData.find((f) => f.metadata?.isArray && f.id === 'data');
      const originalRows = originalArrayField?.fields || [];
      const columns: any[] = [];

      // Process current rows
      arrayField.fields.forEach((currentRow, index) => {
        if (currentRow.id === 'empty' || currentRow.value?.deleted) return;

        const originalRow = originalRows[index];
        const isAdded = currentRow.added || !originalRow;

        if (isAdded) {
          // New row
          const newData = Object.fromEntries(
            currentRow.fields?.filter((f) => f.value != null).map((f) => [f.id, f.value]) || []
          );
          columns.push({ New: newData, Old: {}, Added: true });
        } else {
          // Check for changes
          const changedFields = currentRow.fields?.filter(
            (f) => JSON.stringify(f.value) !== JSON.stringify(f.originalValue)
          );

          if (changedFields && changedFields.length > 0) {
            const newData = Object.fromEntries(changedFields.map((f) => [f.id, f.value]));
            const oldData = Object.fromEntries(currentRow.fields?.map((f) => [f.id, f.originalValue]) || []);
            columns.push({ New: newData, Old: oldData });
          }
        }
      });

      // Check for deleted rows
      originalRows.forEach((originalRow, index) => {
        const currentRow = arrayField.fields?.[index];
        if (!currentRow || currentRow.value?.deleted) {
          const oldData = Object.fromEntries(originalRow.fields?.map((f) => [f.id, f.originalValue]) || []);
          columns.push({ New: oldData, Old: oldData, Deleted: true });
        }
      });

      return columns.length > 0 ? { [tabId]: { Columns: columns } } : null;
    }

    // Simple fields (non-array)
    const changes = Object.fromEntries(
      currentData
        .filter((field) => {
          const originalField = originalData.find((f) => f.id === field.id);
          return field.value !== originalField?.originalValue;
        })
        .map((field) => [field.id, field.value])
    );

    return Object.keys(changes).length > 0 ? { [tabId]: changes } : null;
  };

  const handleCancel = async (): Promise<void> => {
    if (!currentConnection || !tabId || !selectedTab) return;

    resetFormData(selectedTab.id, tabId);
    resetFormData(selectedTab.id, `${tabId}_original`);

    await Promise.all([
      queryClient.refetchQueries({
        queryKey: ['objectTabs', selectedTab.id, currentConnection.id, action]
      }),
      queryClient.refetchQueries({
        queryKey: ['tabFields', currentConnection.id, selectedTab.id, action, tabId]
      })
    ]);

    toast.info('Changes discarded');
  };

  const handleAddArrayItem = useCallback(
    (field: FormFieldType): void => {
      if (!selectedTab?.options?.tabId || !selectedTab?.id) return;

      // Get schema fields from metadata (FormFieldSchema[])
      const schemaFieldsRaw = (field.metadata?.schema as FormFieldSchema[]) || [];
      if (schemaFieldsRaw.length === 0) return;

      // Convert FormFieldSchema[] to FormFieldType[] with metadata.options
      const schemaFields: FormFieldType[] = schemaFieldsRaw.map((schemaField) => ({
        id: schemaField.id,
        name: schemaField.name,
        type: schemaField.type as FormFieldType['type'],
        required: schemaField.required,
        value: schemaField.type === 'multi-select' ? [] : null,
        originalValue: null,
        dependsOn: schemaField.dependsOn,
        metadata: {
          options: schemaField.options
        },
        fields: schemaField.options?.map((opt) => ({
          id: String(opt.value),
          name: opt.label,
          type: 'text' as const,
          required: false,
          value: opt.value,
          metadata: { isOption: true }
        }))
      }));

      // Get current form data from store
      const formData = useDataStore.getState().formDataByTab?.[selectedTab.id]?.[tabId];
      if (!formData) return;

      // Find the array field and add new row
      const updatedFields = formData.map((f: FormFieldType) => {
        if (f.id === field.id && f.metadata?.isArray) {
          const newRowIndex = f.fields?.length || 0;
          const newRow: FormFieldType = {
            id: `row_${newRowIndex}`,
            name: `Row ${newRowIndex + 1}`,
            type: 'text', // Use valid type, mark as object in metadata
            required: false,
            added: true,
            metadata: { isObject: true },
            fields: schemaFields.map((schemaField) => ({
              ...schemaField,
              value: schemaField.type === 'multi-select' ? [] : null,
              originalValue: null
            }))
          };
          return {
            ...f,
            fields: [...(f.fields || []), newRow]
          };
        }
        return f;
      });

      updateFormData(selectedTab.id, tabId, updatedFields);
    },
    [selectedTab?.id, selectedTab?.options?.tabId, tabId, updateFormData]
  );

  const handleUpdateArrayData = useCallback(
    (fieldId: string, updatedField: FormFieldType): void => {
      if (!selectedTab?.options?.tabId || !selectedTab?.id) return;

      // Get current form data from store
      const formData = useDataStore.getState().formDataByTab?.[selectedTab.id]?.[tabId];
      if (!formData) return;

      const updatedFields = formData.map((f: FormFieldType) => (f.id === fieldId ? updatedField : f));
      updateFormData(selectedTab.id, tabId, updatedFields);
    },
    [selectedTab?.id, selectedTab?.options?.tabId, tabId, updateFormData]
  );

  const handleFieldChange = useCallback(
    (fieldId: string, value: any): void => {
      if (!selectedTab?.options?.tabId || !selectedTab?.id) return;

      // Get current form data from store
      const formData = useDataStore.getState().formDataByTab?.[selectedTab.id]?.[tabId];
      if (!formData) return;

      const updatedFields = formData.map((f: FormFieldType) => (f.id === fieldId ? { ...f, value } : f));
      updateFormData(selectedTab.id, tabId, updatedFields);
    },
    [selectedTab?.id, selectedTab?.options?.tabId, tabId, updateFormData]
  );

  return {
    handleSave,
    handleCancel,
    handleAddArrayItem,
    handleUpdateArrayData,
    handleFieldChange
  };
};
