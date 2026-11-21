import locales from '@/locales';
import type { JSX } from 'react';
import DocumentView from './DocumentView/DocumentView';
import RowsView from './RowsView/RowsView';
import TableValueView from './TableValueView/TableValueView';
import TextView from './TextView/TextView';
import type { ItemViewProps, ItemViewRow } from './itemViewTypes';
import { cellText } from './itemViewUtils';

export default function ItemView(props: ItemViewProps): JSX.Element {
  const { item, editable, onSave } = props;

  switch (item.view) {
    case 'text':
      return <TextView {...props} />;
    case 'document':
      return <DocumentView {...props} />;
    case 'fields': {
      const rows = Object.entries((item.value ?? {}) as Record<string, unknown>).map(
        ([k, v]) => [k, cellText(v)] as ItemViewRow
      );
      return (
        <RowsView
          key={item.id}
          rows={rows}
          editable={editable}
          keyed
          keyLabel={locales.nosql_field}
          onSave={(r): void => onSave(Object.fromEntries(r))}
        />
      );
    }
    case 'set':
    case 'list': {
      if (item.view === 'set' && item.meta?.scored) {
        const rows = ((item.value ?? []) as { member: string; score: number }[]).map(
          (z) => [z.member, String(z.score)] as ItemViewRow
        );
        return (
          <RowsView
            key={item.id}
            rows={rows}
            editable={editable}
            keyed
            keyLabel={locales.nosql_member}
            valueLabel={locales.nosql_score}
            onSave={(r): void => onSave(r.map(([member, score]) => ({ member, score: Number(score) })))}
          />
        );
      }
      const rows = ((item.value ?? []) as unknown[]).map((v) => [cellText(v), ''] as ItemViewRow);
      return (
        <RowsView
          key={item.id}
          rows={rows}
          editable={editable}
          keyed={false}
          keyLabel={locales.nosql_member}
          onSave={(r): void => onSave(r.map((x) => x[0]))}
        />
      );
    }
    case 'table':
      return <TableValueView item={item} />;
    default:
      return <></>;
  }
}
