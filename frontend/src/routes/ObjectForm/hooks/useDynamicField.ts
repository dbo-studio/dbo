import api from '@/api';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import { FieldDependencyType, FormFieldOptionType, FormFieldType, FormValue } from '@/types/Tree';
import { useCallback, useEffect, useRef, useState } from 'react';

type FormValues = Record<string, FormValue | FormValue[]>;
type DynamicFieldStateKey = string;

type UseDynamicFieldReturn = {
  getDynamicFieldStateKey: (scopeId: string | number, fieldId: string) => DynamicFieldStateKey;

  refreshDynamicField: (stateKey: DynamicFieldStateKey, field: FormFieldType, fields: FormFieldType[]) => Promise<void>;

  getDynamicOptions: (id: DynamicFieldStateKey) => FormFieldOptionType[];

  isLoadingDynamicField: (id: DynamicFieldStateKey) => boolean;
};

type DynamicFieldState = {
  [fieldId: DynamicFieldStateKey]: {
    options: FormFieldOptionType[];
    loading: boolean;
    cacheKey?: string;
  };
};

const EMPTY_OPTIONS: FormFieldOptionType[] = [];

export const useDynamicField = (objectTabId: string): UseDynamicFieldReturn => {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();

  const [dynamicState, setDynamicState] = useState<DynamicFieldState>({});
  const cacheKeysRef = useRef<Record<string, string>>({});
  const optionsCacheRef = useRef<Record<string, FormFieldOptionType[]>>({});
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const buildFormValues = useCallback(
    (fields: FormFieldType[]) =>
      fields.reduce((acc, f) => {
        acc[f.id] = f.value;
        return acc;
      }, {} as FormValues),
    []
  );

  const clearDynamicFieldState = useCallback((stateKey: DynamicFieldStateKey) => {
    setDynamicState((prev) => ({
      ...prev,
      [stateKey]: { options: EMPTY_OPTIONS, loading: false, cacheKey: undefined }
    }));
    cacheKeysRef.current[stateKey] = '';

    abortControllersRef.current[stateKey]?.abort();
    delete abortControllersRef.current[stateKey];
  }, []);

  const refreshDynamicField = useCallback(
    async (stateKey: DynamicFieldStateKey, field: FormFieldType, fields: FormFieldType[]) => {
      const dependsOn = field.dependsOn;
      if (!dependsOn) return;

      if (!currentConnection?.id || !selectedTab?.nodeId || !objectTabId) return;

      const formValues = buildFormValues(fields);
      const dependentValue = formValues[dependsOn.fieldId];

      if (!hasDependencyValue(dependentValue)) {
        clearDynamicFieldState(stateKey);
        return;
      }

      const cacheKey = buildDynamicCacheKey(field, dependsOn, formValues);
      const cachedOptions = optionsCacheRef.current[cacheKey];

      if (cachedOptions) {
        cacheKeysRef.current[stateKey] = cacheKey;
        setDynamicState((prev) => ({
          ...prev,
          [stateKey]: {
            options: cachedOptions,
            loading: false,
            cacheKey
          }
        }));
        return;
      }

      if (cacheKeysRef.current[stateKey] === cacheKey) return;

      cacheKeysRef.current[stateKey] = cacheKey;

      setDynamicState((prev) => ({
        ...prev,
        [stateKey]: { ...prev[stateKey], loading: true, cacheKey }
      }));

      abortControllersRef.current[stateKey]?.abort();
      const controller = new AbortController();
      abortControllersRef.current[stateKey] = controller;

      try {
        const response = await api.tree.getDynamicFieldOptions(
          {
            connectionId: currentConnection.id,
            nodeId: selectedTab.nodeId,
            parameters: {
              ...buildRequestParameters(dependsOn, formValues)
            }
          },
          controller.signal
        );

        if (abortControllersRef.current[stateKey] === controller) {
          optionsCacheRef.current[cacheKey] = response;
          setDynamicState((prev) => {
            return {
              ...prev,
              [stateKey]: {
                options: response,
                loading: false,
                cacheKey
              }
            };
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'CanceledError') {
          return;
        }
        console.debug('🚀 ~ runRawQuery: ~ error:', error);
        setDynamicState((prev) => ({
          ...prev,
          [stateKey]: {
            options: EMPTY_OPTIONS,
            loading: false,
            cacheKey
          }
        }));
      } finally {
        if (abortControllersRef.current[stateKey] === controller) {
          delete abortControllersRef.current[stateKey];
        }
      }
    },
    [buildFormValues, clearDynamicFieldState, currentConnection?.id, selectedTab?.nodeId, objectTabId]
  );

  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach((controller) => controller.abort());
      abortControllersRef.current = {};
    };
  }, []);

  const getDynamicOptions = useCallback(
    (fieldId: DynamicFieldStateKey): FormFieldOptionType[] => {
      return dynamicState[fieldId]?.options ?? EMPTY_OPTIONS;
    },
    [dynamicState]
  );

  const isLoadingDynamicField = useCallback(
    (fieldId: DynamicFieldStateKey): boolean => {
      return dynamicState[fieldId]?.loading ?? false;
    },
    [dynamicState]
  );

  return {
    getDynamicFieldStateKey,
    refreshDynamicField,
    getDynamicOptions,
    isLoadingDynamicField
  };
};

const getDynamicFieldStateKey = (scopeId: string | number, fieldId: string): DynamicFieldStateKey => {
  return `${scopeId}::${fieldId}`;
};

const hasDependencyValue = (value: FormValue | FormValue[] | undefined): boolean => {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};

const resolveParameterValue = (
  parameterValue: string,
  dependsOn: FieldDependencyType,
  formValues: FormValues
): FormValue | FormValue[] | string => {
  if (parameterValue === '?') {
    return formValues[dependsOn.fieldId];
  }

  if (formValues[parameterValue] !== undefined) {
    return formValues[parameterValue];
  }

  return parameterValue;
};

const buildRequestParameters = (
  dependsOn: FieldDependencyType,
  formValues: FormValues
): Record<string, FormValue | FormValue[] | string> => {
  if (!dependsOn.parameters) {
    return {};
  }

  return Object.entries(dependsOn.parameters).reduce<Record<string, FormValue | FormValue[] | string>>(
    (accumulator, [key, value]) => {
      accumulator[key] = resolveParameterValue(value, dependsOn, formValues);
      return accumulator;
    },
    {}
  );
};

const stringifyCacheValue = (value: FormValue | FormValue[] | string): string => {
  if (Array.isArray(value)) {
    return value.join(',');
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
};

const buildDynamicCacheKey = (field: FormFieldType, dependsOn: FieldDependencyType, formValues: FormValues): string => {
  const dependentValue = formValues[dependsOn.fieldId] ?? '';
  const parameters = dependsOn.parameters
    ? Object.entries(dependsOn.parameters)
        .map(([key, value]) => `${key}:${stringifyCacheValue(resolveParameterValue(value, dependsOn, formValues))}`)
        .join(',')
    : '';

  return `${field.id}__${dependsOn.fieldId}__${stringifyCacheValue(dependentValue)}__${parameters}`;
};
