import api from '@/api';
import type { FormFieldType } from '@/api/tree/types';
import { tools } from '@/core/utils';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useObjectActions = (
  tabId: string | undefined
): {
  handleSave: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleAddArrayItem: (field: FormFieldType) => void;
  handleFieldChange: (formSchema: any, field: string, value: any) => void;
} => {
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const { updateFormData, getFormData, resetFormData, formDataByTab } = useDataStore();
  const selectedTab = useSelectedTab();
  const action = selectedTab?.options?.action || '';
  const { reloadTree } = useTreeStore();

  const { mutateAsync: executeAction, isPending: pendingExecuteAction } = useMutation({
    mutationFn: api.tree.executeAction,
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, selectedTab?.options?.action, tabId]
      });
      reloadTree();
    },
    onError: (error): void => {
      console.error('🚀 ~ handleSave ~ error:', error);
    }
  });

  const handleSave = async (): Promise<void> => {
    if (!currentConnection || !selectedTab || pendingExecuteAction) return;
    console.log(formDataByTab);

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
                          if (item.deleted) {
                            itemAcc.deleted = item.deleted;
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
      console.error('🚀 ~ handleSave ~ error:', error);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!currentConnection || !tabId || !selectedTab) return;

    try {
      resetFormData(tabId, action);

      toast.info('Changes discarded');
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to reset form');
    }
  };

  const handleAddArrayItem = (field: FormFieldType): void => {
    if (!tabId) return;

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

  const handleFieldChange = (formSchema: any, field: string, value: any): void => {
    // Create a new state object with all form values
    const formData = formSchema.reduce(
      (acc: Record<string, any>, field: any) => {
        acc[field.id] = field.value;
        return acc;
      },
      {} as Record<string, any>
    );

    // Update the field that changed
    const newState = { ...formData, [field]: value };

    // Update the form data in the store
    if (tabId) {
      const updatedFields = formSchema.map((field: any) => {
        if (field.type === 'array') {
          return {
            ...field,
            fields: newState[field.id]
          };
        }
        return {
          ...field,
          value: newState[field.id]
        };
      });

      updateFormData(selectedTab?.id ?? '', tabId, updatedFields);
    }
  };

  return {
    handleSave,
    handleCancel,
    handleAddArrayItem,
    handleFieldChange
  };
};
