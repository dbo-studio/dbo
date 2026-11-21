import api from '@/api';
import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import locales from '@/locales';
import { useBrowseStatusStore } from '@/store/browseStatus/browseStatus.store';
import { useFocusedDataStore } from '@/store/dataStore/data.store';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { StatusTextStyled } from '../AppFooter.styled';

const ago = (iso: string): string => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (minutes < 60) return rtf.format(-Math.max(minutes, 0), 'minute');
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), 'hour');
  return rtf.format(-Math.round(minutes / 60 / 24), 'day');
};

/** What the active tab has to say: result size for grids, the last run for Backup. */
export default function TabInfo(): JSX.Element | null {
  const tab = useSelectedTab();
  const rows = useFocusedDataStore((s) => s.rows?.length);
  const selected = useFocusedDataStore((s) => s.selectedRows.length);
  const browse = useBrowseStatusStore();
  const { data: schedules = [] } = useQuery({ queryKey: ['backup-schedules'], queryFn: api.backup.schedules });

  if (tab?.mode === TabMode.Data || tab?.mode === TabMode.Query) {
    if (rows === undefined) return null;
    const parts = [locales.status_rows.replace('{n}', rows.toLocaleString())];
    if (selected > 0) parts.push(locales.status_selected.replace('{n}', String(selected)));

    return <StatusTextStyled data-testid='status-rows'>{parts.join(' · ')}</StatusTextStyled>;
  }

  if (tab?.mode === TabMode.Browse && browse.rows !== null) {
    const parts = [locales.status_rows.replace('{n}', browse.rows.toLocaleString())];
    if (browse.selected > 0) parts.push(locales.status_selected.replace('{n}', String(browse.selected)));
    if (browse.pending > 0) parts.push(locales.nosql_pending_changes.replace('{count}', String(browse.pending)));

    return <StatusTextStyled data-testid='status-rows'>{parts.join(' · ')}</StatusTextStyled>;
  }

  if (tab?.mode === TabMode.Backup) {
    const latest = schedules
      .map((s) => s.lastSuccessAt)
      .filter((v): v is string => !!v)
      .sort()
      .at(-1);

    return (
      <StatusTextStyled data-testid='status-backup-last'>
        {latest ? locales.status_last_backup.replace('{when}', ago(latest)) : locales.status_no_backup}
      </StatusTextStyled>
    );
  }

  return null;
}
