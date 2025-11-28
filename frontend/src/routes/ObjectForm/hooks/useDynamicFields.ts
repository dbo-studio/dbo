import api from '@/api';
import type { DynamicFieldResponse, FieldDependency, FormFieldOption, FormFieldType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useCallback, useEffect, useState } from 'react';

type DynamicFieldState = {
  [fieldId: string]: {
    options: FormFieldOption[];
    loading: boolean;
    error?: string;
  };
};

export const useDynamicFields = (
  fields: FormFieldType[],
  formValues: Record<string, any>
): {
  getDynamicOptions: (fieldId: string) => FormFieldOption[];
  isLoadingDynamicField: (fieldId: string) => boolean;
  refreshDynamicField: (fieldId: string) => Promise<void>;
} => {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const [dynamicState, setDynamicState] = useState<DynamicFieldState>({});

  const fetchDynamicOptions = useCallback(
    async (field: FormFieldType, dependsOn: FieldDependency): Promise<void> => {
      if (!field.dependsOn || !currentConnection?.id || !selectedTab?.nodeId) {
        return;
      }

      if (!dependsOn) {
        setDynamicState((prev) => ({
          ...prev,
          [field.id]: {
            options: [],
            loading: false
          }
        }));
        return;
      }

      setDynamicState((prev) => ({
        ...prev,
        [field.id]: {
          options: prev[field.id]?.options || [],
          loading: true
        }
      }));

      try {
        const response: DynamicFieldResponse = await api.tree.getDynamicFieldOptions({
          connectionId: currentConnection.id,
          nodeId: selectedTab.nodeId,
          parameters: {
            ...dependsOn.parameters
          }
        });

        setDynamicState((prev) => ({
          ...prev,
          [field.id]: {
            options: response.options,
            loading: false
          }
        }));
      } catch (error) {
        console.error('Error fetching dynamic options:', error);
        setDynamicState((prev) => ({
          ...prev,
          [field.id]: {
            options: [],
            loading: false,
            error: 'Failed to load options'
          }
        }));
      }
    },
    [currentConnection?.id, selectedTab?.nodeId, selectedTab?.options?.tabId]
  );

  useEffect(() => {
    const dependentFields = fields.filter((field) => field.dependsOn);

    dependentFields.forEach((field) => {
      if (!field.dependsOn) return;
      fetchDynamicOptions(field, field.dependsOn);
    });
  }, [fields, fetchDynamicOptions]);

  const getDynamicOptions = useCallback(
    (fieldId: string): FormFieldOption[] => {
      return dynamicState[fieldId]?.options || [];
    },
    [dynamicState]
  );

  const isLoadingDynamicField = useCallback(
    (fieldId: string): boolean => {
      return dynamicState[fieldId]?.loading || false;
    },
    [dynamicState]
  );

  const refreshDynamicField = useCallback(
    async (fieldId: string): Promise<void> => {
      const field = fields.find((f) => f.id === fieldId);
      if (field?.dependsOn) {
        const parentValue = formValues[field.dependsOn.fieldId];
        await fetchDynamicOptions(field, parentValue);
      }
    },
    [fields, formValues, fetchDynamicOptions]
  );

  return {
    getDynamicOptions,
    isLoadingDynamicField,
    refreshDynamicField
  };
};
