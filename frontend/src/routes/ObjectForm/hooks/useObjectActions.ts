import api from '@/api';
import type { FormFieldType } from '@/api/tree/types';
import { tools } from '@/core/utils';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useObjectActions = (): {
  handleSave: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleAddArrayItem: (field: FormFieldType) => void;
  handleFieldChange: (field: string, value: any) => void;
} => {
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const formDataByTab = useDataStore((state) => state.formDataByTab);
  const selectedTab = useSelectedTab();

  const action = selectedTab?.options?.action || '';
  const tabId = selectedTab?.options?.tabId || '';

  const updateFormData = useDataStore.getState().updateFormData;
  const getFormData = useDataStore.getState().getFormData;
  const resetFormData = useDataStore.getState().resetFormData;
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
      const allFormData = Object.entries(formDataByTab[selectedTab.id] || {}).reduce(
        (acc, [tabId, fields]) => {
          const tabData = fields.reduce(
            (fieldAcc: Record<string, any>, field: FormFieldType) => {
              if (field.type === 'array' && field.fields) {
                const currentItems = field.fields
                  .filter((item) => item.id !== 'empty')
                  .map((item: FormFieldType) => {
                    if (item.fields) {
                      return item.fields.reduce(
                        (itemAcc: Record<string, any>, nestedField: FormFieldType) => {
                          if (item?.value?.deleted) {
                            itemAcc.deleted = item.value.deleted;
                          }

                          if (item.added) {
                            itemAcc.added = item.added;
                          }

                          const processedValue = tools.isNumber(nestedField.value)
                            ? String(Number(nestedField.value))
                            : nestedField.value;

                          if (
                            nestedField.value !== null ||
                            (nestedField.originalValue && nestedField.originalValue !== nestedField.value)
                          ) {
                            itemAcc.new[nestedField.id] = processedValue;
                          }
                          itemAcc.old[nestedField.id] = nestedField.originalValue;

                          return itemAcc;
                        },
                        { new: {}, old: {} }
                      );
                    }
                    return item.value;
                  });

                fieldAcc[field.id] = currentItems.filter((item) => !tools.isEmpty(item.new));
              } else {
                if (!fieldAcc.new) fieldAcc.new = {};
                if (!fieldAcc.old) fieldAcc.old = {};

                if (field.value !== field.originalValue) {
                  fieldAcc.new[field.id] = field.value;
                }
                fieldAcc.old[field.id] = field.originalValue;
              }

              return fieldAcc;
            },
            {} as Record<string, any>
          );

          if (Object.keys(tabData).length > 0) {
            acc[tabId] = tabData;
          }

          return acc;
        },
        {} as Record<string, Record<string, any>>
      );

      if (Object.keys(allFormData).length === 0) {
        toast.info(locales.no_changes_detected);
        return;
      }

      await executeAction({
        nodeId: selectedTab.nodeId,
        action: selectedTab.options?.action || '',
        connectionId: currentConnection.id,
        data: allFormData
      });

      toast.success(locales.changes_saved_successfully);
    } catch (error) {
      console.debug('🚀 ~ handleSave ~ error:', error);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!currentConnection || !tabId || !selectedTab) return;

    resetFormData(selectedTab?.id ?? '', tabId);

    queryClient.refetchQueries({
      queryKey: ['objectTabs', selectedTab?.id, currentConnection?.id, action]
    });

    queryClient.refetchQueries({
      queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, action, tabId]
    });

    toast.info('Changes discarded');
  };

  const handleAddArrayItem = (field: FormFieldType): void => {
    if (!selectedTab?.options?.tabId) return;

    const template = field.fields?.[0];
    if (!template) return;

    const newField = {
      ...template,
      id: 'object',
      fields: template.fields?.map((f: FormFieldType) => ({
        ...f,
        value: f.type === 'multi-select' ? [] : null
      })),
      added: true
    };

    // Get current form data and update it
    const formData = getFormData(selectedTab?.id ?? '', tabId);
    if (!formData) return;

    // Find the field to update
    const updatedFields = formData.map((f) => {
      if (f.id === field.id) {
        return {
          ...f,
          fields: [...(f.fields || []), newField]
        };
      }
      return f;
    });

    updateFormData(selectedTab?.id ?? '', tabId, updatedFields);
  };

  const handleFieldChange = (field: string, value: any): void => {
    if (!selectedTab?.options?.tabId) return;

    const currentFormData = getFormData(selectedTab?.id ?? '', tabId);
    if (!currentFormData) return;

    // Update the field that changed while preserving other fields
    const updatedFields = currentFormData.map((formField: FormFieldType) => {
      if (formField.id === field) {
        return {
          ...formField,
          value: value
        };
      }
      return formField;
    });

    updateFormData(selectedTab?.id ?? '', tabId, updatedFields);
  };

  return {
    handleSave,
    handleCancel,
    handleAddArrayItem,
    handleFieldChange
  };
};
