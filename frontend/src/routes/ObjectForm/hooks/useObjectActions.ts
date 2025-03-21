import api from '@/api';
import type { FormFieldType } from '@/api/tree/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';

export const useObjectActions = (tabId: string | undefined) => {
  const queryClient = useQueryClient();
  const { currentConnection } = useConnectionStore();
  const { getSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);

  const handleSave = async (formSchema: FormFieldType[]) => {
    if (!currentConnection || !tabId || !selectedTab) return;

    try {
      const formData = formSchema.reduce(
        (acc, field) => {
          if (field.value !== field.originalValue) {
            acc[field.id] = field.value;
          }
          return acc;
        },
        {} as Record<string, any>
      );

      if (Object.keys(formData).length === 0) {
        toast.info('No changes detected');
        return;
      }

      await api.tree.executeAction({
        nodeId: selectedTab.nodeId,
        action: selectedTab.options?.action || '',
        tabId: tabId,
        connectionId: String(currentConnection.id),
        data: formData
      });

      toast.success('Changes saved successfully');

      await queryClient.invalidateQueries({
        queryKey: ['tabFields', currentConnection.id, selectedTab.id, selectedTab.options?.action, tabId]
      });

      await queryClient.invalidateQueries({
        queryKey: ['tree', currentConnection.id]
      });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleCancel = async () => {
    if (!currentConnection || !tabId || !selectedTab) return;

    try {
      await queryClient.invalidateQueries({
        queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, selectedTab?.options?.action, tabId]
      });

      toast.info('Changes discarded');
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to reset form');
    }
  };

  const handleFormChange = (formSchema: FormFieldType[], field: string, value: any, onChange: (value: any) => void) => {
    const formData = formSchema.reduce(
      (acc, field) => {
        acc[field.id] = field.value;
        return acc;
      },
      {} as Record<string, any>
    );

    const newState = { ...formData, [field]: value };
    onChange(newState);
  };

  const handleAddArrayItem = (field: FormFieldType, onChange: (value: any) => void) => {
    const template = field.fields?.[0];
    if (!template) return;

    const newField = {
      ...template,
      id: 'object',
      fields: template.fields?.map((f: FormFieldType) => ({
        ...f,
        value: f.type === 'multi-select' ? [] : null
      }))
    };

    const newFields = [...(field.fields || []), newField];
    onChange(newFields);
  };

  return {
    handleSave,
    handleCancel,
    handleFormChange,
    handleAddArrayItem
  };
};
