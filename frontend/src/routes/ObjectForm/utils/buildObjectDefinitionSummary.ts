import type { FormObjectData } from '@/store/formObject/types';
import type { FormValue } from '@/types/Tree';

type ObjectFormTab = {
  id: string;
  name: string;
};

const formatValue = (value: FormValue | FormValue[] | undefined): string => {
  if (value === undefined || value === null || value === '') return '(empty)';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

export const buildObjectDefinitionSummary = (
  formDataByTab: Record<string, FormObjectData>,
  objectPrefix: string,
  tabs: ObjectFormTab[],
  action?: string
): string => {
  const sections: string[] = [];

  if (action) {
    sections.push(`Action: ${action}`);
  }

  for (const tab of tabs) {
    const formData = formDataByTab[`${objectPrefix}_${tab.id}`];
    if (!formData) continue;

    const tabLines: string[] = [];

    if (formData.general.length > 0) {
      for (const field of formData.general) {
        tabLines.push(`- ${field.name}: ${formatValue(field.value)}`);
      }
    }

    for (const row of formData.data) {
      if (row.some((cell) => cell.deleted)) continue;

      const rowValues = row.map((cell) => `${cell.name}: ${formatValue(cell.value)}`);
      if (rowValues.length > 0) {
        tabLines.push(`- ${rowValues.join(', ')}`);
      }
    }

    if (tabLines.length > 0) {
      sections.push(`${tab.name}:\n${tabLines.join('\n')}`);
    }
  }

  return sections.join('\n\n');
};

export const readObjectNameFromForm = (
  formDataByTab: Record<string, FormObjectData>,
  _objectPrefix: string
): string | undefined => {
  for (const formData of Object.values(formDataByTab)) {
    if (!formData.general.length) continue;

    for (const field of formData.general) {
      if (['name', 'relname', 'datname', 'nspname'].includes(field.id)) {
        const value = field.value;
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
  }

  return undefined;
};

const CONTAINER_SUFFIXES = new Set(['tableContainer', 'viewContainer', 'materializedViewContainer']);

export const parseObjectNodeId = (nodeId: string): { database?: string; schema?: string; objectName?: string } => {
  const parts = nodeId.split('.');
  const last = parts[parts.length - 1];

  if (!last || CONTAINER_SUFFIXES.has(last)) {
    if (parts.length === 3) {
      return { database: parts[0], schema: parts[1] };
    }
    if (parts.length === 2) {
      return { database: parts[0] };
    }
    return {};
  }

  if (parts.length === 3) {
    return { database: parts[0], schema: parts[1], objectName: last };
  }
  if (parts.length === 2) {
    return { database: parts[0], objectName: last };
  }
  if (parts.length === 1) {
    return { objectName: last };
  }

  return { objectName: last };
};
