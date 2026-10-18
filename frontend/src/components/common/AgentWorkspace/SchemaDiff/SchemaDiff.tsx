import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { variables } from '@/core/theme/variables';
import { TabMode } from '@/core/enums';
import type { DiagramGraph } from '@/core/diagram/types';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AiChangeset, AiChangesetOp } from '@/types';
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { type JSX } from 'react';
import { DiffOpStyled, DiffRowStyled, DiffTableHeaderStyled, DiffTableStyled } from './SchemaDiff.styled';
import { diffRows } from './schemaDiffRows';

type SchemaDiffProps = {
  changeset: AiChangeset;
  before: DiagramGraph | undefined;
  onReview: (status: 'accepted' | 'rejected', position: number) => void;
};

/** Per-table before/after of the proposal, with Accept/Reject per op. */
export default function SchemaDiff({ changeset, before, onReview }: SchemaDiffProps): JSX.Element {
  const tables = [
    ...changeset.ops.reduce(
      (groups, op) => groups.set(op.table, [...(groups.get(op.table) ?? []), op]),
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
              {table}
            </Typography>
            {!ops.some((op) => op.op === 'create_table') && (
              <Button size='small' variant='text' onClick={() => openForm(ops[0])} data-testid='ai-diff-open-form'>
                {locales.ai_changes_open_form}
              </Button>
            )}
          </DiffTableHeaderStyled>
          {ops.map((op) => (
            <DiffOpStyled
              key={op.position}
              muted={op.status === 'rejected'}
              data-testid='ai-diff-op'
              data-status={op.status}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {diffRows(op, before).map((row) => (
                  <DiffRowStyled key={row.text} sign={row.sign}>
                    {row.sign} {row.text}
                  </DiffRowStyled>
                ))}
                {op.error && (
                  <Typography variant='caption' color='error'>
                    {op.error}
                  </Typography>
                )}
              </Box>
              <Chip
                size='small'
                variant='outlined'
                label={locales[`ai_op_status_${op.status}`]}
                color={op.status === 'applied' ? 'success' : op.status === 'failed' ? 'error' : 'default'}
                sx={{ height: 18, fontSize: variables.fontSize.xs }}
              />
              {op.status !== 'applied' && (
                <Stack direction='row'>
                  <Tooltip title={locales.ai_changes_accept}>
                    <IconButton
                      size='small'
                      disabled={op.status === 'accepted'}
                      onClick={() => onReview('accepted', op.position)}
                      data-testid='ai-diff-accept'
                    >
                      <CustomIcon type='check' size='xs' />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={locales.ai_reject}>
                    <IconButton
                      size='small'
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
