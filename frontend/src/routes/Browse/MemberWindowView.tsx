import api from '@/api';
import type { NoSQLItem, NoSQLMember, NoSQLMemberOp } from '@/api/nosql/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import {
  CellInput,
  SelectTableCell,
  SelectTableHeader,
  StyledCol,
  StyledTable,
  StyledTableHead,
  StyledTableRow,
  TableCell,
  TableContainer,
  TableHeader
} from '@/components/common/DataGrid/DataGrid.styled';
import GridCheckbox from '@/components/common/DataGrid/GridCheckbox';
import { HeaderColumnContentStyled, HeaderColumnTypeStyled } from '@/components/common/DataGrid/DataGridTableHeaderRow/DataGridTableHeaderRow.styled';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import ResizableModal from '@/components/base/Modal/ResizableModal/ResizableModal';
import { DataValueEditor } from '@/components/common/DataGrid/DataValuePanel/DataValuePanel';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import PaginationControls from '@/components/common/DataGridStatusBar/PaginationControls';
import { useBrowseStatusStore } from '@/store/browseStatus/browseStatus.store';
import { StatusBarStyled } from '@/components/common/DataGridStatusBar/StatusBar.styled';
import { StatusBarActionsStackStyled } from '@/components/common/DataGridStatusBar/StatusBarActions.styled';
import { shortcuts } from '@/core/utils';
import { useShortcut } from '@/hooks';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';

const PAGE = 100;
const SELECT_WIDTH = 30;
const KEY_WIDTH = 260;

const chordLabel = (label: string, command: string[]): string => `${label} (${command.join('+')})`;

type Props = { item: NoSQLItem; connectionId: number; containerId: string; editable: boolean };

type Layout = { type: string; scored: boolean; hasValue: boolean; keyLabel: string; keyType: string; valueLabel: string; valueType: string };

function layoutOf(item: NoSQLItem): Layout {
  const type = typeof item.meta?.type === 'string' ? item.meta.type : '';
  const scored = !!item.meta?.scored;

  return {
    type,
    scored,
    hasValue: type === 'hash' || type === 'list' || scored,
    keyLabel: type === 'hash' ? locales.nosql_field : type === 'list' ? '#' : locales.nosql_member,
    keyType: type === 'list' ? 'index' : 'string',
    valueLabel: scored ? locales.nosql_score : locales.nosql_value,
    valueType: scored ? 'number' : 'string'
  };
}

/**
 * Members of a hash, list, set or sorted set as a grid that looks and behaves like the SQL grid: select rows,
 * edit a cell in place, add or remove rows from the bottom bar. Members load a window at a time and every
 * change is one member operation, so a key with millions of members is neither loaded nor rewritten whole.
 */
export default function MemberWindowView({ item, connectionId, containerId, editable }: Props): JSX.Element {
  const qc = useQueryClient();
  const l = layoutOf(item);
  const queryKey = ['nosql', 'window', connectionId, containerId, item.id];
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<string | null>(null);
  // Like the SQL grid, changes are staged (highlighted) until the check button applies them.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [added, setAdded] = useState<{ id: number; key: string; value: string }[]>([]);
  const [menu, setMenu] = useState<{ x: number; y: number; member?: NoSQLMember; header?: boolean } | null>(null);
  const [quick, setQuick] = useState<NoSQLMember | null>(null);
  const [quickSize, setQuickSize] = useState({ width: 480, height: 420 });
  const [, copy] = useCopyToClipboard();
  const confirmDanger = useConfirmModalStore((state) => state.danger);

  // Pages follow the server cursor, so going back reuses the cursors of pages already visited.
  const [limit, setLimit] = useState(PAGE);
  const [cursors, setCursors] = useState<string[]>(['']);
  const [pageIdx, setPageIdx] = useState(0);

  const q = useQuery({
    queryKey: ['nosql', 'window', connectionId, containerId, item.id, limit, cursors[pageIdx]],
    queryFn: () =>
      api.nosql.memberWindow({ connectionId, containerId, itemId: item.id, cursor: cursors[pageIdx], limit }),
    placeholderData: keepPreviousData
  });

  const members = q.data?.members ?? [];
  const total = q.data?.total ?? 0;
  const nextCursor = q.data?.nextCursor ?? '';
  const shown = (m: NoSQLMember): string => (l.scored ? String(m.score ?? '') : m.value);

  const apply = async (ops: NoSQLMemberOp[]): Promise<boolean> => {
    try {
      const done = await withSafeModeRetry(async (confirmed) => {
        for (const op of ops) {
          await api.nosql.applyMember({ connectionId, containerId, itemId: item.id, op, confirmed });
        }
        return true;
      });
      await qc.invalidateQueries({ queryKey });
      return !!done;
    } catch {
      toast.error(locales.action_failed);
      return false;
    }
  };

  const setOp = (key: string, value: string): NoSQLMemberOp =>
    l.scored ? { op: 'set', key, value: '', score: Number(value) } : { op: l.type === 'list' && !key ? 'append' : 'set', key, value };

  const stageEdit = (m: NoSQLMember, value: string): void => {
    const next = { ...edits };
    if (value === shown(m)) delete next[m.key];
    else next[m.key] = value;
    setEdits(next);
  };

  const commitCell = (m: NoSQLMember, value: string): void => {
    setEditing(null);
    stageEdit(m, value);
  };

  const addRow = (): void => setAdded([{ id: Date.now(), key: '', value: '' }, ...added]);

  const addedReady = (r: { key: string; value: string }): boolean =>
    l.type === 'list' ? r.value !== '' : r.key !== '' && (l.type !== 'zset' || r.value !== '');

  // Highlight first, then act: delete stages the highlighted rows; the check button applies after asking.
  const removeSelected = (): void => {
    if (selected.size === 0) return;
    setRemoved(new Set([...removed, ...members.filter((m) => selected.has(m.key)).map((m) => m.key)]));
  };

  const pending = Object.keys(edits).length + removed.size + added.filter(addedReady).length;

  const discard = (): void => {
    setEdits({});
    setRemoved(new Set());
    setAdded([]);
    setSelected(new Set());
    setEditing(null);
  };

  const save = (): void => {
    if (pending === 0) return;
    const byKey = new Map(members.map((m) => [m.key, m]));
    const ops: NoSQLMemberOp[] = [
      ...Object.entries(edits).filter(([k]) => !removed.has(k)).map(([k, v]) => setOp(k, v)),
      // List indexes shift after every removal, so remove from the end.
      ...[...removed]
        .sort((a, b) => (l.type === 'list' ? Number(b) - Number(a) : 0))
        .map((k) => ({ op: 'remove', key: k, value: byKey.get(k)?.value ?? '' })),
      ...added.filter(addedReady).map((r) => setOp(l.type === 'list' ? '' : r.key, r.value))
    ];
    const run = (): void => void apply(ops).then((ok) => ok && discard());

    if (removed.size === 0) {
      run();
      return;
    }

    confirmDanger(
      locales.nosql_delete_members,
      locales.nosql_delete_members_confirm.replace('{count}', String(removed.size)).replace('{id}', item.id),
      run
    );
  };

  const refresh = (): void => {
    discard();
    void q.refetch();
  };

  const selectOnly = (key: string): void => setSelected(new Set([key]));

  const toggle = (key: string): void => {
    const next = new Set(selected);
    if (!next.delete(key)) next.add(key);
    setSelected(next);
  };

  const allSelected = members.length > 0 && members.every((m) => selected.has(m.key));

  const goTo = (idx: number): void => {
    if (idx > pageIdx) setCursors((c) => (c.length > idx ? c : [...c, nextCursor]));
    setPageIdx(idx);
    discard();
  };

  // Report to the app status bar; cleared when the grid goes away.
  useEffect(() => {
    useBrowseStatusStore.setState({ rows: total, selected: selected.size, pending });
  }, [total, selected.size, pending]);
  useEffect(() => (): void => useBrowseStatusStore.setState({ rows: null, selected: 0, pending: 0 }), []);

  const copyText = (text: string): void => {
    void copy(text).then(() => toast.success(locales.copied));
  };

  const openMenu = (e: React.MouseEvent, member?: NoSQLMember, header = false): void => {
    e.preventDefault();
    e.stopPropagation();
    // Right-clicking an unselected row makes it the selection, like the SQL grid.
    if (member && !selected.has(member.key)) setSelected(new Set([member.key]));
    setMenu({ x: e.clientX + 2, y: e.clientY - 6, member, header });
  };

  const shared: MenuType[] = [
    { name: locales.add_row, closeBeforeAction: true, disabled: !editable, disabledReason: locales.grid_menu_read_only, action: addRow },
    { name: locales.refresh, closeBeforeAction: true, action: refresh }
  ];

  const menuItems = (): MenuType[] => {
    if (!menu) return [];
    if (menu.header) {
      return [{ name: locales.copy_column_name, closeAfterAction: true, action: (): void => copyText(l.keyLabel) }, { name: 'separator', separator: true }, ...shared];
    }
    const m = menu.member;
    if (!m) return shared;

    return [
      { name: locales.quick_look_editor, closeBeforeAction: true, action: (): void => setQuick(m) },
      { name: 'separator', separator: true },
      {
        name: locales.copy,
        children: [
          { name: locales.copy_cell, closeAfterAction: true, action: (): void => copyText(l.hasValue ? shown(m) : m.key) },
          { name: locales.copy_row_tsv, closeAfterAction: true, action: (): void => copyText(l.hasValue ? `${m.key}\t${shown(m)}` : m.key) },
          { name: locales.copy_column_name, closeAfterAction: true, action: (): void => copyText(l.keyLabel) }
        ]
      },
      { name: 'separator', separator: true },
      {
        name: locales.delete_row,
        closeBeforeAction: true,
        destructive: true,
        disabled: !editable,
        disabledReason: locales.grid_menu_read_only,
        action: removeSelected
      },
      { name: 'separator', separator: true },
      ...shared
    ];
  };

  useShortcut(shortcuts.saveGrid, () => editable && save());
  useShortcut(shortcuts.addRow, () => editable && addRow());
  useShortcut(shortcuts.discardChanges, () => editable && discard());

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-testid='member-window'>
      <ContextMenu menu={menuItems()} contextMenu={menu ? { mouseX: menu.x, mouseY: menu.y } : null} onClose={(): void => setMenu(null)} />
      <ResizableModal
        open={!!quick}
        onClose={(): void => setQuick(null)}
        title={`${locales.quick_look_editor} : ${quick?.key ?? ''}`}
        onResize={(width: number, height: number): void => setQuickSize({ width, height })}
      >
        {quick && (
          <Box sx={{ height: '100%' }}>
            <DataValueEditor
              key={`${quick.key}:${edits[quick.key] ?? shown(quick)}`}
              value={l.hasValue ? (edits[quick.key] ?? shown(quick)) : quick.key}
              editable={editable && l.hasValue}
              width={quickSize.width}
              height={quickSize.height}
              onCancel={(): void => setQuick(null)}
              onApply={(next): void => {
                stageEdit(quick, typeof next === 'string' ? next : '');
                setQuick(null);
              }}
            />
          </Box>
        )}
      </ResizableModal>
      <TableContainer sx={{ flex: 1, minHeight: 0 }} onContextMenu={(e): void => openMenu(e)} data-testid='member-window-scroll'>
        <StyledTable width='100%'>
          <colgroup>
            {editable && <StyledCol width={SELECT_WIDTH} />}
            <StyledCol width={l.hasValue ? KEY_WIDTH : undefined} />
            {l.hasValue && <StyledCol />}
          </colgroup>
          <StyledTableHead>
            <StyledTableRow>
              {editable && (
                <SelectTableHeader>
                  <GridCheckbox
                    aria-label={locales.select_all}
                    checked={allSelected}
                    onChange={(): void => setSelected(allSelected ? new Set() : new Set(members.map((m) => m.key)))}
                  />
                </SelectTableHeader>
              )}
              <TableHeader onContextMenu={(e): void => openMenu(e, undefined, true)}>
                <HeaderColumnContentStyled>
                  {l.keyLabel}
                  <HeaderColumnTypeStyled>{l.keyType}</HeaderColumnTypeStyled>
                </HeaderColumnContentStyled>
              </TableHeader>
              {l.hasValue && (
                <TableHeader>
                  <HeaderColumnContentStyled>
                    {l.valueLabel}
                    <HeaderColumnTypeStyled>{l.valueType}</HeaderColumnTypeStyled>
                  </HeaderColumnContentStyled>
                </TableHeader>
              )}
            </StyledTableRow>
          </StyledTableHead>
          <tbody>
            {added.map((r) => (
              <StyledTableRow className='unsaved-highlight' key={r.id} data-testid='member-draft'>
                {editable && <SelectTableCell />}
                <TableCell>
                  {l.type === 'list' ? (
                    <Typography variant='caption' color='textSubdued' sx={{ px: 1 }}>
                      {total}
                    </Typography>
                  ) : (
                    <CellInput
                      autoFocus
                      aria-label='member-key'
                      value={r.key}
                      onChange={(e): void => setAdded(added.map((x) => (x.id === r.id ? { ...x, key: e.target.value } : x)))}
                      onKeyDown={(e): void => {
                        if (e.key === 'Escape') setAdded(added.filter((x) => x.id !== r.id));
                      }}
                    />
                  )}
                </TableCell>
                {l.hasValue && (
                  <TableCell>
                    <CellInput
                      autoFocus={l.type === 'list'}
                      aria-label='member-value'
                      type={l.scored ? 'number' : 'text'}
                      value={r.value}
                      onChange={(e): void => setAdded(added.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))}
                      onKeyDown={(e): void => {
                        if (e.key === 'Escape') setAdded(added.filter((x) => x.id !== r.id));
                      }}
                    />
                  </TableCell>
                )}
              </StyledTableRow>
            ))}
            {members.map((m, i) => {
              const isSelected = selected.has(m.key);
              const cellId = `${m.key}`;

              return (
                <StyledTableRow key={m.key} onClick={(): void => selectOnly(m.key)} onContextMenu={(e): void => openMenu(e, m)} className={`${removed.has(m.key) ? 'removed-highlight' : edits[m.key] !== undefined ? 'edit-highlight' : isSelected ? 'selected-highlight' : ''} ${i % 2 ? 'is-striped' : ''}`} data-testid='member-row'>
                  {editable && (
                    <SelectTableCell>
                      <GridCheckbox aria-label={locales.nosql_select_row} checked={isSelected} onChange={(): void => toggle(m.key)} />
                    </SelectTableCell>
                  )}
                  <TableCell title={m.key}>
                    <Box sx={{ px: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.key}</Box>
                  </TableCell>
                  {l.hasValue && (
                    <TableCell title={shown(m)} onDoubleClick={(): void => editable && setEditing(cellId)}>
                      {editable && editing === cellId ? (
                        <CellInput
                          autoFocus
                          aria-label='member-value'
                          type={l.scored ? 'number' : 'text'}
                          defaultValue={edits[m.key] ?? shown(m)}
                          onBlur={(e): void => commitCell(m, e.target.value)}
                          onKeyDown={(e): void => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                            if (e.key === 'Escape') setEditing(null);
                          }}
                        />
                      ) : (
                        <Box sx={{ px: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{edits[m.key] ?? shown(m)}</Box>
                      )}
                    </TableCell>
                  )}
                </StyledTableRow>
              );
            })}
          </tbody>
        </StyledTable>
      </TableContainer>

      <StatusBarStyled direction='row' data-testid='member-status-bar'>
        <StatusBarActionsStackStyled>
          {editable && (
            <>
              <Tooltip title={chordLabel(locales.add_row, shortcuts.addRow.command)}>
                <IconButton aria-label={locales.add_row} onClick={addRow}>
                  <CustomIcon type='plus' size='s' />
                </IconButton>
              </Tooltip>
              <Tooltip title={locales.remove_row}>
                <span>
                  <IconButton aria-label={locales.remove_row} disabled={selected.size === 0} onClick={removeSelected}>
                    <CustomIcon type='mines' size='s' />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={chordLabel(locales.save, shortcuts.saveGrid.command)}>
                <span>
                  <IconButton aria-label={locales.save} data-testid='member-save' disabled={pending === 0} onClick={save}>
                    <CustomIcon type='check' size='s' />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={chordLabel(locales.discard_changes, shortcuts.discardChanges.command)}>
                <span>
                  <IconButton aria-label={locales.discard_changes} disabled={pending === 0 && removed.size === 0} onClick={discard}>
                    <CustomIcon type='close' size='s' />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
          <Tooltip title={chordLabel(locales.refresh, shortcuts.reloadTab.command)}>
            <IconButton aria-label={locales.refresh} onClick={refresh}>
              <CustomIcon type='refresh' size='s' />
            </IconButton>
          </Tooltip>
        </StatusBarActionsStackStyled>
        <PaginationControls
          page={pageIdx + 1}
          limit={limit}
          disabled={q.isFetching}
          canNext={!!nextCursor}
          onPrev={(): void => goTo(pageIdx - 1)}
          onNext={(): void => goTo(pageIdx + 1)}
          onLimit={(next): void => {
            setLimit(next);
            setCursors(['']);
            setPageIdx(0);
            discard();
          }}
        />
      </StatusBarStyled>
    </Box>
  );
}
