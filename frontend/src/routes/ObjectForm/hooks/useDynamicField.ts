import api from '@/api';
import type { DynamicFieldResponse } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { ObjectTabType } from '@/types';
import type { FieldDependencyType, FormFieldOptionType, FormFieldType } from '@/types/Tree';
import { useCallback, useEffect, useRef, useState } from 'react';

type DynamicFieldState = {
  [fieldId: string]: {
    options: FormFieldOptionType[];
    loading: boolean;
    error?: string;
    cacheKey?: string;
  };
};

type FormValues = Record<string, string | number | boolean | string[] | null | undefined>;

const buildCacheKey = (fieldId: string, dependsOn: FieldDependencyType, formValues: FormValues): string => {
  const dependentValue = formValues[dependsOn.fieldId] ?? '';

  const params = dependsOn.parameters
    ? Object.keys(dependsOn.parameters)
        .map((key) => {
          const paramValue = dependsOn.parameters?.[key];
          let resolvedValue = '';

          if (paramValue === '?') {
            // If value is "?", use the dependsOn.fieldId value from formValues
            const val = formValues[dependsOn.fieldId];
            resolvedValue = val !== undefined && val !== null ? String(val) : '';
          } else if (typeof paramValue === 'string' && formValues[paramValue] !== undefined) {
            // If paramValue is a field id reference
            const val = formValues[paramValue];
            resolvedValue = val !== undefined && val !== null ? String(val) : '';
          } else {
            // Otherwise use the paramValue as is
            resolvedValue = paramValue !== undefined && paramValue !== null ? String(paramValue) : '';
          }

          return `${key}:${resolvedValue}`;
        })
        .join(',')
    : '';

  return `${fieldId}_${dependsOn.fieldId}_${dependentValue}_${params}`;
};

export const useDynamicField = (
  fields: FormFieldType[],
  formValues: FormValues
): {
  getDynamicOptions: (fieldId: string) => FormFieldOptionType[];
  isLoadingDynamicField: (fieldId: string) => boolean;
  refreshDynamicField: (fieldId: string, dependsOn: FieldDependencyType) => Promise<void>;
} => {
  const selectedTab = useSelectedTab<ObjectTabType>();
  const currentConnection = useCurrentConnection();
  const [dynamicState, setDynamicState] = useState<DynamicFieldState>({});
  const cacheKeysRef = useRef<Record<string, string>>({});

  const fetchDynamicOptions = useCallback(
    async (field: FormFieldType, dependsOn: FieldDependencyType): Promise<void> => {
      if (!dependsOn?.fieldId || !currentConnection?.id || !selectedTab?.nodeId || !selectedTab?.objectTabId) {
        return;
      }

      const dependentValue = formValues[dependsOn.fieldId];
      if (dependentValue === undefined || dependentValue === null || dependentValue === '') {
        setDynamicState((prev) => ({
          ...prev,
          [field.id]: {
            options: [],
            loading: false,
            cacheKey: undefined
          }
        }));
        cacheKeysRef.current[field.id] = '';
        return;
      }

      const cacheKey = buildCacheKey(field.id, dependsOn, formValues);
      const previousCacheKey = cacheKeysRef.current[field.id];

      if (previousCacheKey === cacheKey) {
        return;
      }

      setDynamicState((prev) => ({
        ...prev,
        [field.id]: {
          options: prev[field.id]?.options || [],
          loading: true,
          cacheKey
        }
      }));

      try {
        const parameters: Record<string, string | number | boolean | string[] | null | undefined> = {};

        if (dependsOn.parameters) {
          Object.keys(dependsOn.parameters).forEach((key) => {
            const paramValue = dependsOn.parameters?.[key];

            if (paramValue === '?') {
              // If value is "?", use the dependsOn.fieldId value from formValues
              const fieldValue = formValues[dependsOn.fieldId];
              if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                parameters[key] = fieldValue;
              }
            } else if (typeof paramValue === 'string' && formValues[paramValue] !== undefined) {
              // If paramValue is a field id reference, get its value from formValues
              parameters[key] = formValues[paramValue];
            } else {
              // Otherwise use the paramValue as is (literal value like "columns")
              parameters[key] = paramValue;
            }
          });
        }

        const response: DynamicFieldResponse = await api.tree.getDynamicFieldOptions({
          connectionId: currentConnection.id,
          nodeId: selectedTab.nodeId,
          parameters: {
            ...parameters
          }
        });

        cacheKeysRef.current[field.id] = cacheKey;

        setDynamicState((prev) => ({
          ...prev,
          [field.id]: {
            options: response,
            loading: false,
            cacheKey
          }
        }));
      } catch (error) {
        console.error('Error fetching dynamic options:', error);
        setDynamicState((prev) => ({
          ...prev,
          [field.id]: {
            options: [],
            loading: false,
            error: 'Failed to load options',
            cacheKey
          }
        }));
      }
    },
    [currentConnection?.id, selectedTab?.nodeId, selectedTab?.objectTabId, formValues]
  );

  useEffect(() => {
    const dependentFields = fields.filter((field) => field.dependsOn);

    dependentFields.forEach((field) => {
      if (!field.dependsOn) return;
      fetchDynamicOptions(field, field.dependsOn);
    });
  }, [fields, formValues, fetchDynamicOptions]);

  const getDynamicOptions = useCallback(
    (fieldId: string): FormFieldOptionType[] => {
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
    async (fieldId: string, dependsOn: FieldDependencyType): Promise<void> => {
      const field = fields.find((f) => f.id === fieldId);
      if (field && dependsOn) {
        await fetchDynamicOptions(field, dependsOn);
      }
    },
    [fields, fetchDynamicOptions]
  );

  return {
    getDynamicOptions,
    isLoadingDynamicField,
    refreshDynamicField
  };
};
