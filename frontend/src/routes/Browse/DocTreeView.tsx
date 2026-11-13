import api from '@/api';
import type { NoSQLDocChildren, NoSQLDocNode } from '@/api/nosql/types';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import VirtualList from '@/components/base/VirtualList/VirtualList';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Box, Button, IconButton, MenuItem, Select, Tooltip, Typography } from '@mui/material';
import { type JSX, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ContextMenuType } from '@/types';
import { EDIT_TYPES, type EditType, editText, isEditType, toWire, validFieldName } from './docTreeValue';

type Props = {
  connectionId: number;
  containerId: string;
  itemId: string;
  editable: boolean;
  /** Called after a field changed, so the JSON view and the list know the document moved. */
  onMutated: () => void;
};

/** A form that adds a field. It shows right below the row it was opened from. */
type AddTarget = { parent: string[]; parentType: string; after: string };

type Row =
  | { kind: 'node'; node: NoSQLDocNode; depth: number; parentType: string }
  | { kind: 'more'; path: string[]; depth: number; loaded: number; total: number }
  | { kind: 'add'; parent: string[]; parentType: string; depth: number };

const ROOT: string[] = [];
const PAGE = 100;
const INDENT = 16;
const EXPAND_DEPTH = 5;
const EXPAND_BUDGET = 100;

const keyOf = (path: string[]): string => JSON.stringify(path);
const isContainer = (t: string): boolean => t === 'object' || t === 'array';
const summary = (n: NoSQLDocNode): string => (n.type === 'array' ? `Array(${n.count})` : `{${n.count}}`);

export default function DocTreeView({ connectionId, containerId, itemId, editable, onMutated }: Props): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const confirmDanger = useConfirmModalStore((s) => s.danger);
  const [cache, setCache] = useState<Record<string, NoSQLDocChildren>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([keyOf(ROOT)]));
  const [selected, setSelected] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<{ key: string; draft: string; type: EditType } | null>(null);
  const [adding, setAdding] = useState<AddTarget | null>(null);
  const [addKey, setAddKey] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addType, setAddType] = useState<EditType | 'auto'>('auto');
  const [ctx, setCtx] = useState<{ at: ContextMenuType; node: NoSQLDocNode; parentType: string } | null>(null);

  const fetchLevel = useCallback(
    (path: string[], offset = 0): Promise<NoSQLDocChildren> =>
      api.nosql.docChildren({ connectionId, containerId, itemId, path, offset, limit: PAGE }),
    [connectionId, containerId, itemId]
  );

  const load = useCallback(
    async (path: string[], offset = 0): Promise<void> => {
      try {
        const res = await fetchLevel(path, offset);
        const k = keyOf(path);
        setCache((c) => ({
          ...c,
          [k]: offset === 0 ? res : { total: res.total, nodes: [...(c[k]?.nodes ?? []), ...res.nodes] }
        }));
      } catch {
        toast.error(locales.action_failed);
      }
    },
    [fetchLevel]
  );

  useEffect(() => {
    void load(ROOT);
  }, [load]);

  const toggle = (path: string[]): void => {
    const k = keyOf(path);
    const next = new Set(expanded);
    if (next.delete(k)) {
      setExpanded(next);
      return;
    }
    next.add(k);
    setExpanded(next);
    if (!cache[k]) void load(path);
  };

  /** Opens containers level by level, fetching what is missing, within a depth and request budget. */
  const expandAll = async (): Promise<void> => {
    const nextExpanded = new Set(expanded);
    const nextCache = { ...cache };
    let budget = EXPAND_BUDGET;
    let limited = false;
    let level: string[][] = [ROOT];

    try {
      for (let depth = 0; depth < EXPAND_DEPTH && level.length > 0; depth++) {
        const next: string[][] = [];
        for (const path of level) {
          if (!nextCache[keyOf(path)]) {
            if (budget <= 0) {
              limited = true;
              continue;
            }
            budget--;
            nextCache[keyOf(path)] = await fetchLevel(path);
          }
          nextExpanded.add(keyOf(path));
          for (const n of nextCache[keyOf(path)].nodes) if (isContainer(n.type) && n.count > 0) next.push(n.path);
        }
        level = next;
      }
      if (level.length > 0) limited = true;
      setCache(nextCache);
      setExpanded(nextExpanded);
      if (limited) toast.info(locales.nosql_expand_limited);
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const mutate = async (path: string[], run: (confirmed?: boolean) => Promise<void>): Promise<boolean> => {
    try {
      const done = await withSafeModeRetry(async (confirmed) => {
        await run(confirmed);
        return true;
      });
      if (!done) return false;
      // The parent level changed, and its own row shows a child count.
      await load(path.slice(0, -1));
      if (path.length > 1) await load(path.slice(0, -2));
      onMutated();
      return true;
    } catch {
      toast.error(locales.action_failed);
      return false;
    }
  };

  const setField = (path: string[], wire: string): Promise<boolean> =>
    mutate(path, (confirmed) =>
      api.nosql.docSetField({ connectionId, containerId, itemId, path, value: wire, confirmed })
    );

  const unset = (n: NoSQLDocNode): void =>
    confirmDanger(
      locales.nosql_delete_field,
      locales.nosql_delete_field_confirm.replace('{field}', n.key),
      () =>
        void mutate(n.path, (confirmed) =>
          api.nosql.docUnsetField({ connectionId, containerId, itemId, path: n.path, confirmed })
        )
    );

  /** Gives keyboard focus back to the tree after an edit or add form closes. */
  const refocus = (): void => scrollRef.current?.focus();

  const cancelAdd = (): void => {
    setAdding(null);
    refocus();
  };

  const cancelEdit = (): void => {
    setEditing(null);
    refocus();
  };

  const startEdit = (n: NoSQLDocNode): void => {
    if (!isEditType(n.type)) return;
    setAdding(null);
    setEditing({ key: keyOf(n.path), draft: editText(n), type: n.type });
  };

  const applyEdit = async (n: NoSQLDocNode): Promise<void> => {
    if (!editing) return;
    const wire = toWire(editing.draft, editing.type);
    if (wire === null) {
      toast.error(locales.nosql_invalid_value.replace('{type}', editing.type));
      return;
    }
    if (await setField(n.path, wire)) {
      setEditing(null);
      refocus();
    }
  };

  const startAdd = (target: AddTarget): void => {
    setEditing(null);
    setAddKey('');
    setAddValue('');
    setAddType('auto');
    setAdding(target);
    if (target.parent.length > 0 && !expanded.has(keyOf(target.parent))) toggle(target.parent);
  };

  const applyAdd = async (): Promise<void> => {
    if (!adding) return;
    const isArray = adding.parentType === 'array';
    // Writing at index == length appends to an array.
    const key = isArray ? String(cache[keyOf(adding.parent)]?.total ?? 0) : addKey;
    if (!isArray && !validFieldName(addKey)) {
      toast.error(locales.nosql_invalid_field_name);
      return;
    }
    const wire = toWire(addValue, addType);
    if (wire === null) {
      toast.error(locales.nosql_invalid_value.replace('{type}', addType));
      return;
    }
    if (await setField([...adding.parent, key], wire)) {
      setAdding(null);
      refocus();
    }
  };

  const copyText = async (text: string, message: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const copyPath = (): Promise<void> => copyText((selected ?? []).join('.'), locales.nosql_path_copied);

  /** What the right-click menu offers for one row; write actions only appear when the field can be written. */
  const menuFor = (node: NoSQLDocNode, parentType: string): MenuType[] => {
    const k = keyOf(node.path);
    const container = isContainer(node.type);
    const writable = editable && node.path[0] !== '_id';
    const canEditValue = writable && !container && !node.truncated && isEditType(node.type);
    const items: MenuType[] = [];

    if (canEditValue) {
      items.push({
        name: locales.nosql_edit_value,
        icon: 'edit',
        closeBeforeAction: true,
        action: (): void => startEdit(node)
      });
    }
    if (writable) {
      items.push({
        name: container ? locales.nosql_add_child : locales.nosql_add_after,
        icon: 'plus',
        closeBeforeAction: true,
        action: (): void =>
          startAdd(
            container
              ? { parent: node.path, parentType: node.type, after: k }
              : { parent: node.path.slice(0, -1), parentType, after: k }
          )
      });
    }
    if (container && node.count > 0) {
      const open = expanded.has(k);
      items.push({
        name: open ? locales.nosql_collapse : locales.nosql_expand,
        icon: open ? 'chevronRight' : 'chevronDown',
        closeBeforeAction: true,
        action: (): void => toggle(node.path)
      });
    }
    items.push({ name: '', separator: true });
    if (!container && !node.truncated) {
      items.push({
        name: locales.nosql_copy_value,
        icon: 'copy',
        closeBeforeAction: true,
        action: (): void => void copyText(editText(node), locales.nosql_copied)
      });
    }
    items.push(
      {
        name: locales.nosql_copy_key,
        icon: 'copy',
        closeBeforeAction: true,
        action: (): void => void copyText(node.key, locales.nosql_copied)
      },
      {
        name: locales.nosql_copy_path,
        icon: 'copy',
        closeBeforeAction: true,
        action: (): void => void copyText(node.path.join('.'), locales.nosql_path_copied)
      }
    );
    if (writable && parentType === 'object' && node.key !== '_id') {
      items.push(
        { name: '', separator: true },
        {
          name: locales.nosql_delete_field,
          icon: 'delete',
          destructive: true,
          closeBeforeAction: true,
          action: (): void => unset(node)
        }
      );
    }

    return items;
  };

  const rows: Row[] = [];
  const walk = (path: string[], depth: number, parentType: string): void => {
    const level = cache[keyOf(path)];
    // A root-level add form is the first row, since the document itself has no row to sit under.
    if (path.length === 0 && adding && adding.after === keyOf(ROOT)) {
      rows.push({ kind: 'add', parent: ROOT, parentType: 'object', depth });
    }
    for (const node of level?.nodes ?? []) {
      rows.push({ kind: 'node', node, depth, parentType });
      const open = isContainer(node.type) && expanded.has(keyOf(node.path));
      // The add form sits right under the row it was opened from: first child of a container, or next sibling.
      if (adding && adding.after === keyOf(node.path)) {
        const inside = isContainer(node.type);
        rows.push({
          kind: 'add',
          parent: adding.parent,
          parentType: adding.parentType,
          depth: inside ? depth + 1 : depth
        });
      }
      if (open) walk(node.path, depth + 1, node.type);
    }
    if (level && level.nodes.length < level.total) {
      rows.push({ kind: 'more', path, depth, loaded: level.nodes.length, total: level.total });
    }
  };
  walk(ROOT, 0, 'object');

  const nodeRows = rows.flatMap((r, index) => (r.kind === 'node' ? [{ ...r, index }] : []));
  const selectedPos = selected ? nodeRows.findIndex((r) => keyOf(r.node.path) === keyOf(selected)) : -1;
  const activeIndex = selectedPos >= 0 ? nodeRows[selectedPos].index : undefined;

  const select = (pos: number): void => {
    const target = nodeRows[Math.max(0, Math.min(pos, nodeRows.length - 1))];
    if (target) setSelected(target.node.path);
  };

  const onTreeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    // Keys typed in an edit or add box belong to that box.
    if (e.target !== e.currentTarget || nodeRows.length === 0) return;

    const cur = selectedPos >= 0 ? nodeRows[selectedPos] : null;
    const node = cur?.node;
    const container = !!node && isContainer(node.type);
    const writable = !!node && editable && node.path[0] !== '_id';
    const canEditValue = writable && !!node && !container && !node.truncated && isEditType(node.type);
    const mod = e.metaKey || e.ctrlKey;
    let handled = true;

    switch (e.key) {
      case 'ArrowDown':
        select(selectedPos + 1);
        break;
      case 'ArrowUp':
        select(selectedPos < 0 ? 0 : selectedPos - 1);
        break;
      case 'PageDown':
        select(selectedPos + 10);
        break;
      case 'PageUp':
        select(selectedPos - 10);
        break;
      case 'Home':
        select(0);
        break;
      case 'End':
        select(nodeRows.length - 1);
        break;
      case 'ArrowRight':
        if (cur && node && container && node.count > 0) {
          if (!expanded.has(keyOf(node.path))) toggle(node.path);
          else select(selectedPos + 1);
        }
        break;
      case 'ArrowLeft':
        if (cur && node) {
          if (container && expanded.has(keyOf(node.path))) toggle(node.path);
          else if (node.path.length > 1) setSelected(node.path.slice(0, -1));
        }
        break;
      case 'Enter':
      case 'F2':
        if (node && canEditValue) startEdit(node);
        else if (node && container && node.count > 0) toggle(node.path);
        break;
      case ' ':
        if (node && container && node.count > 0) toggle(node.path);
        break;
      case 'Insert':
      case '+':
        if (cur && node && writable) {
          startAdd(
            container
              ? { parent: node.path, parentType: node.type, after: keyOf(node.path) }
              : { parent: node.path.slice(0, -1), parentType: cur.parentType, after: keyOf(node.path) }
          );
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (cur && node && writable && cur.parentType === 'object') unset(node);
        break;
      case 'c':
      case 'C':
        if (mod && node) {
          if (e.shiftKey || container || node.truncated) void copyText(node.path.join('.'), locales.nosql_path_copied);
          else void copyText(editText(node), locales.nosql_copied);
        } else handled = false;
        break;
      default:
        handled = false;
    }

    if (handled) e.preventDefault();
  };

  const typeSelect = (value: string, onChange: (v: string) => void, withAuto: boolean, label: string): JSX.Element => (
    <Select value={value} onChange={(e): void => onChange(e.target.value)} inputProps={{ 'aria-label': label }}>
      {withAuto && <MenuItem value='auto'>{locales.nosql_type_auto}</MenuItem>}
      {EDIT_TYPES.map((t) => (
        <MenuItem key={t} value={t}>
          {t}
        </MenuItem>
      ))}
    </Select>
  );

  const renderRow = (row: Row): JSX.Element => {
    const pad = row.depth * INDENT + 8;

    if (row.kind === 'more') {
      return (
        <Box sx={{ pl: `${pad}px`, py: 0.25 }}>
          <Button onClick={(): void => void load(row.path, row.loaded)}>
            {locales.nosql_load_more} ({row.loaded}/{row.total})
          </Button>
        </Box>
      );
    }

    if (row.kind === 'add') {
      const isArray = row.parentType === 'array';
      return (
        <Box
          data-testid='doc-add-form'
          sx={{ pl: `${pad + INDENT}px`, pr: 1, py: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}
        >
          {!isArray && (
            <FieldInput
              autoFocus
              placeholder={locales.nosql_field_name}
              value={addKey}
              onChange={(e): void => setAddKey(e.target.value)}
              onKeyDown={(e): void => {
                if (e.key === 'Escape') cancelAdd();
              }}
              inputProps={{ 'aria-label': 'new-field-name' }}
            />
          )}
          <FieldInput
            autoFocus={isArray}
            placeholder={locales.nosql_field_value}
            value={addValue}
            onChange={(e): void => setAddValue(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter') void applyAdd();
              if (e.key === 'Escape') cancelAdd();
            }}
            inputProps={{ 'aria-label': 'new-field-value' }}
          />
          {typeSelect(addType, (v): void => setAddType(v as EditType | 'auto'), true, 'new-field-type')}
          <Tooltip title={locales.nosql_add_field}>
            <IconButton aria-label='apply-add' disabled={!isArray && !addKey} onClick={(): void => void applyAdd()}>
              <CustomIcon type='check' size='s' />
            </IconButton>
          </Tooltip>
          <Tooltip title={locales.cancel}>
            <IconButton aria-label='cancel-add' onClick={cancelAdd}>
              <CustomIcon type='close' size='s' />
            </IconButton>
          </Tooltip>
        </Box>
      );
    }

    const { node, parentType } = row;
    const k = keyOf(node.path);
    const container = isContainer(node.type);
    const isSelected = selected !== null && keyOf(selected) === k;
    const isEditing = editing?.key === k;
    const writable = editable && node.path[0] !== '_id';
    const canEditValue = writable && !container && !node.truncated && isEditType(node.type);

    return (
      <Box
        data-testid={`doc-node-${node.path.join('.')}`}
        role='treeitem'
        aria-level={row.depth + 1}
        aria-selected={isSelected}
        aria-expanded={container && node.count > 0 ? expanded.has(k) : undefined}
        onMouseDown={(): void => setSelected(node.path)}
        onContextMenu={(e): void => {
          e.preventDefault();
          setSelected(node.path);
          setCtx({ at: { mouseX: e.clientX + 2, mouseY: e.clientY - 6 }, node, parentType });
        }}
        sx={{
          pl: `${pad}px`,
          pr: 1,
          py: 0.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minHeight: 32,
          // One thin line per ancestor level, so deep nesting stays readable.
          backgroundImage: (theme) =>
            `repeating-linear-gradient(to right, ${theme.palette.divider} 0 1px, transparent 1px ${INDENT}px)`,
          backgroundSize: `${row.depth * INDENT}px 100%`,
          backgroundPosition: '15px 0',
          backgroundRepeat: 'no-repeat',
          bgcolor: isSelected ? 'action.selected' : undefined,
          '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
          '&:hover .row-actions, &:focus-within .row-actions': { visibility: 'visible' },
          '& .row-actions': { visibility: isSelected ? 'visible' : 'hidden' }
        }}
      >
        <Box sx={{ width: 16, display: 'flex', flexShrink: 0 }}>
          {container && node.count > 0 && (
            <IconButton sx={{ p: 0 }} aria-label={`toggle-${node.key}`} onClick={(): void => toggle(node.path)}>
              <CustomIcon type={expanded.has(k) ? 'chevronDown' : 'chevronRight'} size='xs' />
            </IconButton>
          )}
        </Box>
        <Typography variant='body2' sx={{ fontWeight: 600, flexShrink: 0 }}>
          {node.key}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0 }}>
          {node.type}
        </Typography>
        {container ? (
          <Typography variant='body2' color='text.secondary'>
            {node.count === 0 ? locales.nosql_empty_container : summary(node)}
          </Typography>
        ) : isEditing && editing ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <FieldInput
              autoFocus
              fullWidth
              value={editing.draft}
              onChange={(e): void => setEditing({ ...editing, draft: e.target.value })}
              onKeyDown={(e): void => {
                if (e.key === 'Escape') cancelEdit();
                if (e.key === 'Enter') void applyEdit(node);
              }}
              inputProps={{ 'aria-label': 'field-value' }}
            />
            {typeSelect(
              editing.type,
              (v): void => setEditing({ ...editing, type: v as EditType }),
              false,
              'field-type'
            )}
            <Tooltip title={locales.nosql_save_value}>
              <IconButton aria-label='apply-edit' onClick={(): void => void applyEdit(node)}>
                <CustomIcon type='check' size='s' />
              </IconButton>
            </Tooltip>
            <Tooltip title={locales.cancel}>
              <IconButton aria-label='cancel-edit' onClick={cancelEdit}>
                <CustomIcon type='close' size='s' />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Typography
            variant='body2'
            noWrap
            title={node.truncated ? locales.nosql_value_truncated : undefined}
            sx={{ fontFamily: 'monospace', cursor: canEditValue ? 'text' : 'default', minWidth: 0 }}
            onClick={(): void => {
              if (canEditValue) startEdit(node);
            }}
          >
            {node.value}
            {node.truncated ? '…' : ''}
          </Typography>
        )}
        {writable && !isEditing && (
          <Box className='row-actions' sx={{ ml: 'auto', flexShrink: 0, display: 'flex' }}>
            {canEditValue && (
              <Tooltip title={locales.nosql_edit_value}>
                <IconButton aria-label={`edit-${node.key}`} onClick={(): void => startEdit(node)}>
                  <CustomIcon type='edit' size='s' />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={container ? locales.nosql_add_child : locales.nosql_add_after}>
              <IconButton
                aria-label={`add-${node.key}`}
                onClick={(): void =>
                  startAdd(
                    container
                      ? { parent: node.path, parentType: node.type, after: k }
                      : { parent: node.path.slice(0, -1), parentType, after: k }
                  )
                }
              >
                <CustomIcon type='plus' size='s' />
              </IconButton>
            </Tooltip>
            {parentType === 'object' && node.key !== '_id' && (
              <Tooltip title={locales.nosql_delete_field}>
                <IconButton aria-label={`delete-${node.key}`} onClick={(): void => unset(node)}>
                  <CustomIcon type='delete' size='s' />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider'
        }}
        data-testid='doc-tree-toolbar'
      >
        {editable && (
          <Button
            data-testid='doc-add-root'
            onClick={(): void => startAdd({ parent: ROOT, parentType: 'object', after: keyOf(ROOT) })}
          >
            {locales.nosql_add_field}
          </Button>
        )}
        <Button data-testid='doc-expand-all' onClick={(): void => void expandAll()}>
          {locales.nosql_expand_all}
        </Button>
        <Button data-testid='doc-collapse-all' onClick={(): void => setExpanded(new Set([keyOf(ROOT)]))}>
          {locales.nosql_collapse_all}
        </Button>
        <Typography
          variant='caption'
          color='text.secondary'
          noWrap
          sx={{ ml: 1, flex: 1, minWidth: 0, fontFamily: 'monospace' }}
          data-testid='doc-breadcrumb'
        >
          {selected?.join(' › ')}
        </Typography>
        {selected && (
          <Tooltip title={locales.nosql_copy_path}>
            <IconButton aria-label='copy-path' onClick={(): void => void copyPath()}>
              <CustomIcon type='copy' size='s' />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <ContextMenu
        menu={ctx ? menuFor(ctx.node, ctx.parentType) : []}
        contextMenu={ctx?.at ?? null}
        onClose={(): void => setCtx(null)}
      />
      <Box
        ref={scrollRef}
        role='tree'
        tabIndex={0}
        aria-label={locales.nosql_tree_label}
        onKeyDown={onTreeKeyDown}
        sx={{ flex: 1, minHeight: 0, overflow: 'auto', py: 0.5, outline: 'none' }}
        data-testid='doc-tree'
      >
        <VirtualList
          items={rows}
          estimateSize={32}
          gap={0}
          scrollElementRef={scrollRef}
          getItemKey={(row, i): string =>
            row.kind === 'node'
              ? keyOf(row.node.path)
              : row.kind === 'add'
                ? `add:${keyOf(row.parent)}`
                : `more:${keyOf(row.path)}:${i}`
          }
          renderItem={renderRow}
          activeIndex={activeIndex}
        />
      </Box>
    </Box>
  );
}
