import api from '@/api';
import type { FormObjectResponseType, FormSchemaResponseType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import type { FormFieldType, FormFieldWithState } from '@/types/Tree';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { FormDataState, FormValue } from '../types';

const createInitialFormState = (
  schema: FormFieldType[],
  data: Record<string, FormValue>[],
  isArray: boolean
): FormFieldWithState[] => {
  if (isArray) {
    return schema.map((field) => ({
      ...field,
      value: data.length > 0 ? data.map((row) => row[field.id] ?? null) : []
    }));
  }

  const firstRow = data[0] ?? {};
  return schema.map((field) => {
    const fieldWithState = field as FormFieldWithState;
    const rawValue = firstRow[field.id] ?? fieldWithState.originalValue ?? null;
    return {
      ...field,
      value: rawValue,
      originalValue: rawValue
    };
  });
};

const convertFieldsToData = (fields: FormFieldWithState[], isArray: boolean): Record<string, FormValue>[] => {
  if (isArray) {
    if (fields.length === 0) return [];
    const firstField = fields[0];
    if (Array.isArray(firstField.value)) {
      return firstField.value.map((_: unknown, index: number): Record<string, FormValue> => {
        const row: Record<string, FormValue> = {};
        fields.forEach((field) => {
          row[field.id] = Array.isArray(field.value) ? field.value[index] : null;
        });
        return row;
      });
    }
    return [];
  }

  const row: Record<string, FormValue> = {};
  fields.forEach((field) => {
    row[field.id] = field.value ?? null;
  });
  return [row];
};

export const useFormData = (tabId: string | null, isEditMode: boolean): FormDataState | null => {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const { getFormData, updateFormData } = useDataStore();
  const formDataByTab = useDataStore((state) => state.formDataByTab);

  const { data: response, isLoading } = useQuery({
    queryKey: [
      'formData',
      currentConnection?.id,
      selectedTab?.id,
      selectedTab?.options?.action,
      tabId,
      isEditMode,
      selectedTab?.nodeId
    ],
    queryFn: (): Promise<FormObjectResponseType | FormSchemaResponseType> =>
      isEditMode
        ? api.tree.getObject({
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action ?? '',
            tabId: tabId ?? '',
            connectionId: currentConnection?.id ?? 0
          })
        : api.tree.getSchema({
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action ?? '',
            tabId: tabId ?? '',
            connectionId: currentConnection?.id ?? 0
          }),
    enabled: !!(
      currentConnection?.id &&
      selectedTab?.id &&
      selectedTab?.options?.action &&
      tabId &&
      selectedTab?.nodeId
    )
  });

  const formState = useMemo((): FormDataState | null => {
    if (!response || !tabId || !selectedTab?.id) return null;

    const isArray = 'isArray' in response ? response.isArray : false;
    const schema: FormFieldType[] = 'isArray' in response ? response.schema : (response as FormSchemaResponseType);
    const data: Record<string, FormValue>[] = 'data' in response ? response.data : [];

    const storageKey = `${selectedTab.id}_${tabId}`;
    const cachedData = formDataByTab[selectedTab.id]?.[storageKey] as FormFieldWithState[] | undefined;

    if (cachedData && cachedData.length > 0) {
      return {
        schema: cachedData,
        data: convertFieldsToData(cachedData, isArray),
        isArray,
        originalData: data
      };
    }

    const initialFields = createInitialFormState(schema, data, isArray);

    return {
      schema: initialFields,
      data,
      isArray,
      originalData: data
    };
  }, [response, tabId, selectedTab?.id, formDataByTab]);

  useEffect(() => {
    if (!response || !tabId || !selectedTab?.id) return;

    const storageKey = `${selectedTab.id}_${tabId}`;
    const cachedData = getFormData(selectedTab.id, storageKey) as FormFieldWithState[] | undefined;

    if (!cachedData || cachedData.length === 0) {
      const isArray = 'isArray' in response ? response.isArray : false;
      const schema: FormFieldType[] = 'isArray' in response ? response.schema : (response as FormSchemaResponseType);
      const data: Record<string, FormValue>[] = 'data' in response ? response.data : [];
      const initialFields = createInitialFormState(schema, data, isArray);
      updateFormData(selectedTab.id, storageKey, initialFields);
    }
  }, [response, tabId, selectedTab?.id, getFormData, updateFormData]);

  if (isLoading || !formState) return null;

  return formState;
};
