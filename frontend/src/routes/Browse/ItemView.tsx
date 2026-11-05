import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { NoSQLItem } from '@/api/nosql/types';
import CodeEditor from '@/components/base/CodeEditor/CodeEditor';
import locales from '@/locales';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField
} from '@mui/material';
import { type JSX, useState } from 'react';

type ItemViewProps = {
  item: NoSQLItem;
  editable: boolean;
  onSave: (value: unknown) => void;
};

const isBase64 = (item: NoSQLItem): boolean => item.meta?.encoding === 'base64';

const bytesOf = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const asText = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value, null, 2));

const cellText = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));

type TextMode = 'raw' | 'json' | 'hex' | 'base64';

/** Display transforms for a text value. Binary (base64) values are only editable as base64. */
function renderText(value: string, binary: boolean, mode: TextMode): string {
  const bytes = binary ? bytesOf(value) : new TextEncoder().encode(value);

  switch (mode) {
    case 'hex':
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
    case 'base64':
      return binary ? value : btoa(String.fromCharCode(...bytes));
    case 'json':
      try {
        return JSON.stringify(JSON.parse(binary ? new TextDecoder().decode(bytes) : value), null, 2);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

function TextView({ item, editable, onSave }: ItemViewProps): JSX.Element {
  const binary = isBase64(item);
  const [mode, setMode] = useState<TextMode>(binary ? 'base64' : 'raw');
  const [draft, setDraft] = useState<string | null>(null);
  const source = typeof item.value === 'string' ? item.value : '';
  // Only the transport representation round-trips losslessly, so only it is editable.
  const canEdit = editable && mode === (binary ? 'base64' : 'raw');
  const shown = canEdit ? (draft ?? source) : renderText(source, binary, mode);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', gap: 1, p: 1, alignItems: 'center' }}>
        <Select size='small' value={mode} onChange={(e): void => setMode(e.target.value)} aria-label='text-mode'>
          <MenuItem value='raw'>{locales.nosql_view_raw}</MenuItem>
          <MenuItem value='json'>{locales.nosql_view_json}</MenuItem>
          <MenuItem value='hex'>{locales.nosql_view_hex}</MenuItem>
          <MenuItem value='base64'>{locales.nosql_view_base64}</MenuItem>
        </Select>
        {canEdit && (
          <Button size='small' variant='contained' onClick={(): void => onSave(draft ?? source)}>
            {locales.nosql_save}
          </Button>
        )}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <CodeEditor
          value={shown}
          onChange={setDraft}
          language={mode === 'json' ? 'json' : 'plaintext'}
          editable={canEdit}
        />
      </Box>
    </Box>
  );
}

function DocumentView({ item, editable, onSave }: ItemViewProps): JSX.Element {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {editable && (
        <Box sx={{ p: 1 }}>
          <Button size='small' variant='contained' onClick={(): void => onSave(draft ?? asText(item.value))}>
            {locales.nosql_save}
          </Button>
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <CodeEditor
          value={draft ?? asText(typeof item.value === 'string' ? tryPretty(item.value) : item.value)}
          onChange={setDraft}
          language='json'
          editable={editable}
        />
      </Box>
    </Box>
  );
}

function tryPretty(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

type Row = [string, string];

/** Shared editable key/value (hash) and member (list/set) table. */
function RowsView({
  rows,
  editable,
  keyed,
  keyLabel,
  valueLabel,
  onSave
}: {
  rows: Row[];
  editable: boolean;
  keyed: boolean;
  keyLabel: string;
  valueLabel?: string;
  onSave: (rows: Row[]) => void;
}): JSX.Element {
  const [draft, setDraft] = useState<Row[]>(rows);
  const setCell = (i: number, col: 0 | 1, v: string): void =>
    setDraft(draft.map((r, idx) => (idx === i ? (col === 0 ? [v, r[1]] : [r[0], v]) : r)));

  return (
    <Box sx={{ p: 1, overflow: 'auto', height: '100%' }}>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>{keyed ? keyLabel : '#'}</TableCell>
            <TableCell>{keyed ? (valueLabel ?? locales.nosql_value) : keyLabel}</TableCell>
            {editable && <TableCell />}
          </TableRow>
        </TableHead>
        <TableBody>
          {draft.map((r, i) => (
            <TableRow key={i}>
              <TableCell>
                {keyed ? <Cell value={r[0]} editable={editable} onChange={(v): void => setCell(i, 0, v)} /> : i}
              </TableCell>
              <TableCell>
                <Cell
                  value={keyed ? r[1] : r[0]}
                  editable={editable}
                  onChange={(v): void => setCell(i, keyed ? 1 : 0, v)}
                />
              </TableCell>
              {editable && (
                <TableCell>
                  <IconButton
                    aria-label={locales.nosql_remove_row}
                    size='small'
                    onClick={(): void => setDraft(draft.filter((_, idx) => idx !== i))}
                  >
                    <CustomIcon type='close' size='s' />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editable && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button size='small' onClick={(): void => setDraft([...draft, ['', '']])}>
            {locales.nosql_add_row}
          </Button>
          <Button size='small' variant='contained' onClick={(): void => onSave(draft)}>
            {locales.nosql_save}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function Cell({
  value,
  editable,
  onChange
}: {
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
}): JSX.Element {
  return editable ? (
    <TextField
      size='small'
      variant='standard'
      value={value}
      onChange={(e): void => onChange(e.target.value)}
      fullWidth
    />
  ) : (
    <>{value}</>
  );
}

function TableValueView({ item }: { item: NoSQLItem }): JSX.Element {
  const rows = (Array.isArray(item.value) ? item.value : []) as Record<string, unknown>[];
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  return (
    <Box sx={{ p: 1, overflow: 'auto', height: '100%' }}>
      <Table size='small'>
        <TableHead>
          <TableRow>
            {cols.map((c) => (
              <TableCell key={c}>{c}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {cols.map((c) => (
                <TableCell key={c}>{cellText(r[c])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

/** Renders one item by its ViewKind; the Browse frame never knows which database the item came from. */
export default function ItemView(props: ItemViewProps): JSX.Element {
  const { item, editable, onSave } = props;

  switch (item.view) {
    case 'text':
      return <TextView {...props} />;
    case 'document':
      return <DocumentView {...props} />;
    case 'fields': {
      const rows = Object.entries((item.value ?? {}) as Record<string, unknown>).map(
        ([k, v]) => [k, cellText(v)] as Row
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
      if (item.meta?.scored) {
        const rows = ((item.value ?? []) as { member: string; score: number }[]).map(
          (z) => [z.member, String(z.score)] as Row
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
    // falls through: plain sets share the list renderer
    case 'list': {
      const rows = ((item.value ?? []) as unknown[]).map((v) => [cellText(v), ''] as Row);
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
