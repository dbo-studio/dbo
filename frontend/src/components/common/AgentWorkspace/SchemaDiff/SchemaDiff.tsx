import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { variables } from '@/core/theme/variables';
import { TabMode } from '@/core/enums';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AiChangeset, AiChangesetOp, SchemaChangeOp, TableStructure } from '@/types';
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import OpEditor from './OpEditor';
import WriteSample from './WriteSample';
import CurrentStructure from './CurrentStructure';
import { DiffOpStyled, DiffRowStyled, DiffTableHeaderStyled, DiffTableStyled } from './SchemaDiff.styled';
import { diffRows } from './schemaDiffRows';

/** Ops the inline editor can change; renames, views, constraints and drops are rejected and asked for again. */
const EDITABLE: SchemaChangeOp['op'][] = [
  'create_database',
  'create_schema',
  'create_table',
  'add_column',
  'alter_column',
  'add_index',
  'add_foreign_key'
];

/** Ops share a card by table; the ones with none (data changes, new databases) get their own. */
const groupKey = (op: AiChangesetOp): string => op.table || op.name || op.op;

type SchemaDiffProps = {
  changeset: AiChangeset;
  before: Record<string, TableStructure> | undefined;
  onReview: (status: 'accepted' | 'rejected', position: number) => void;
  onEdit: (position: number, op: SchemaChangeOp) => void;
};

/** Per-table before/after of the proposal, with Accept/Reject per op. */
export default function SchemaDiff({ changeset, before, onReview, onEdit }: SchemaDiffProps): JSX.Element {
  const [editing, setEditing] = useState<number>();
  const tables = [
    ...changeset.ops.reduce(
      (groups, op) => groups.set(groupKey(op), [...(groups.get(groupKey(op)) ?? []), op]),
      new Map<string, AiChangesetOp[]>()
    )
  ];

  const openForm = (op: AiChangesetOp): void => {
    useTabStore.getState().addObjectTab(op.table, op.tableId, 'editTable', TabMode.Object);
  };

  return (
    <Stack spacing={1} data-testid='ai-schema-diff'>
      {tables.map(([table, ops]) => (
        <DiffTableStyled key={table} data-testid='ai-diff-table' data-table={table}>
          <DiffTableHeaderStyled>
            <CustomIcon type='structure' size='xs' />
            <Typography variant='subtitle2' sx={{ flex: 1 }}>
              {table === 'write' ? locales.ai_changes_data : table === 'undo' ? locales.ai_changes_undo_title : table}
            </Typography>
            {!ops.some((op) => op.op === 'create_table' || op.op === 'undo' || op.name) && (
              <Button variant='text' onClick={() => openForm(ops[0])} data-testid='ai-diff-open-form'>
                {locales.ai_changes_open_form}
              </Button>
            )}
          </DiffTableHeaderStyled>
          {before?.[table] && <CurrentStructure structure={before[table]} />}
          {ops.map((op) => (
            <DiffOpStyled
              key={op.position}
              muted={op.status === 'rejected'}
              data-testid='ai-diff-op'
              data-status={op.status}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {editing === op.position ? (
                  <OpEditor
                    op={op}
                    onCancel={() => setEditing(undefined)}
                    onSave={(edited) => {
                      onEdit(op.position, edited);
                      setEditing(undefined);
                    }}
                  />
                ) : (
                  diffRows(op, before?.[op.table]).map((row) => (
                    <DiffRowStyled key={row.text} sign={row.sign}>
                      {row.sign} {row.text}
                    </DiffRowStyled>
                  ))
                )}
                {op.op === 'write' && op.status !== 'applied' && (
                  <WriteSample changeset={changeset} position={op.position} />
                )}
                {op.error && (
                  <Typography variant='caption' color='error'>
                    {op.error}
                  </Typography>
                )}
                {op.undoNote && op.status !== 'rejected' && (
                  <Typography variant='caption' color='textSubdued' data-testid='ai-undo-note'>
                    {locales.ai_undo_unavailable.replace('{reason}', op.undoNote)}
                  </Typography>
                )}
              </Box>
              <Chip
                variant='outlined'
                label={locales[`ai_op_status_${op.status}`]}
                color={op.status === 'applied' ? 'success' : op.status === 'failed' ? 'error' : 'default'}
                sx={{ height: 18, fontSize: variables.fontSize.xs }}
              />
              {op.status !== 'applied' && (
                <Stack direction='row'>
                  {EDITABLE.includes(op.op) && (
                    <Tooltip title={locales.ai_changes_edit}>
                      <IconButton onClick={() => setEditing(op.position)} data-testid='ai-diff-edit'>
                        <CustomIcon type='pen' size='xs' />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={locales.ai_changes_accept}>
                    <IconButton
                      disabled={op.status === 'accepted'}
                      onClick={() => onReview('accepted', op.position)}
                      data-testid='ai-diff-accept'
                    >
                      <CustomIcon type='check' size='xs' />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={locales.ai_reject}>
                    <IconButton
                      disabled={op.status === 'rejected'}
                      onClick={() => onReview('rejected', op.position)}
                      data-testid='ai-diff-reject'
                    >
                      <CustomIcon type='close' size='xs' />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </DiffOpStyled>
          ))}
        </DiffTableStyled>
      ))}
    </Stack>
  );
}
