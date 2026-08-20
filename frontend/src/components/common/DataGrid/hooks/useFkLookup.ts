import api from '@/api';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { TabMode } from '@/core/enums';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import type { ColumnType, TabType } from '@/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFkReferencedColumns, isForeignKeyPickerColumn } from './fkColumn';

const DEBOUNCE_MS = 250;
const NULL_OPTION_VALUE = '__dbo_null__';

export { isCompositeForeignKey, isForeignKeyPickerColumn, isSingleColumnForeignKey } from './fkColumn';
export { NULL_OPTION_VALUE };

type UseFkLookupArgs = {
  column?: ColumnType;
  enabled: boolean;
};

type UseFkLookupReturn = {
  options: SelectInputOption[];
  loading: boolean;
  search: (q: string) => void;
  canLookup: boolean;
};

function optionIdFromValue(value: unknown): string {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return value == null ? '' : JSON.stringify(value);
}

function normalizeFkOption(item: { value?: unknown; label?: string }): SelectInputOption {
  const raw = item.value;
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const fkValues: Record<string, string> = {};
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      fkValues[key] =
        typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
          ? String(val)
          : val == null
            ? ''
            : JSON.stringify(val);
    }

    return {
      value: optionIdFromValue(fkValues),
      label: item.label || optionIdFromValue(fkValues),
      fkValues
    };
  }

  const scalar =
    typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean'
      ? String(raw)
      : raw == null
        ? ''
        : JSON.stringify(raw);

  return {
    value: scalar,
    label: item.label || scalar
  };
}

export function useFkLookup({ column, enabled }: UseFkLookupArgs): UseFkLookupReturn {
  const selectedTab = useSelectedTab<TabType>();
  const currentConnection = useCurrentConnection();
  const updatableNodeId = useDataStore((state) => state.updatableNodeId);

  const [options, setOptions] = useState<SelectInputOption[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodeId = useMemo(() => {
    if (selectedTab?.mode === TabMode.Data && selectedTab.nodeId) {
      return selectedTab.nodeId;
    }
    return updatableNodeId;
  }, [selectedTab, updatableNodeId]);

  const referencedColumns = useMemo(() => getFkReferencedColumns(column), [column]);

  const canLookup = Boolean(
    enabled && currentConnection?.id && nodeId && isForeignKeyPickerColumn(column) && referencedColumns.length > 0
  );

  const referencedColumnsKey = referencedColumns.join(',');

  const fetchOptions = useCallback(
    async (q: string) => {
      if (!canLookup || !currentConnection?.id || !nodeId || !column?.referencedTable) {
        return;
      }

      const keys = referencedColumnsKey.split(',').filter(Boolean);
      if (keys.length === 0) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const response = await api.tree.getDynamicFieldOptions(
          {
            connectionId: Number(currentConnection.id),
            nodeId,
            parameters: {
              field: 'fk_values',
              table: column.referencedTable,
              keyColumn: keys[0],
              keyColumns: referencedColumnsKey,
              ...(column.referencedSchema ? { schema: column.referencedSchema } : {}),
              ...(q ? { q } : {}),
              limit: 25
            }
          },
          controller.signal
        );

        if (abortRef.current !== controller) {
          return;
        }

        setOptions(response.map((item) => normalizeFkOption(item)));
      } catch (error) {
        if (error instanceof Error && (error.name === 'CanceledError' || error.name === 'AbortError')) {
          return;
        }
        setOptions([]);
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [canLookup, column, currentConnection?.id, nodeId, referencedColumnsKey]
  );

  const search = useCallback(
    (q: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void fetchOptions(q);
      }, DEBOUNCE_MS);
    },
    [fetchOptions]
  );

  useEffect(() => {
    if (!enabled || !canLookup) {
      return;
    }
    void fetchOptions('');
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [enabled, canLookup, fetchOptions]);

  return { options, loading, search, canLookup };
}
