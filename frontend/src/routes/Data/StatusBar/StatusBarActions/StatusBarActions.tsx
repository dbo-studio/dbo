import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useDataGridRowActions } from '@/components/common/DataGrid/hooks/useDataGridRowActions';
import { useSaveGridChanges } from '@/components/common/DataGrid/hooks/useSaveGridChanges';
import { shortcuts } from '@/core/utils';
import { useShortcut } from '@/hooks';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import locales from '@/locales';
import { IconButton, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import { StatusBarActionsStackStyled } from './StatusBarActions.styled';

const chordLabel = (label: string, command: string[]): string => `${label} (${command.join('+')})`;

export default function StatusBarActions(): JSX.Element {
  const { isMobile } = useLayoutMode();
  const { canEditGrid, isDataFetching, addRow, removeSelectedRows, discardChanges, refreshOrStop } =
    useDataGridRowActions();

  const { save: handleSave, saving: updateQueryPending } = useSaveGridChanges();

  const editDisabled = updateQueryPending || isDataFetching;

  useShortcut(shortcuts.saveGrid, () => {
    if (canEditGrid && !editDisabled) {
      void handleSave();
    }
  });
  useShortcut(shortcuts.addRow, () => {
    if (canEditGrid && !editDisabled) {
      void addRow();
    }
  });
  useShortcut(shortcuts.discardChanges, () => {
    if (canEditGrid && !editDisabled) {
      void discardChanges();
    }
  });

  return (
    <StatusBarActionsStackStyled mobile={isMobile}>
      {canEditGrid && (
        <>
          <Tooltip title={chordLabel(locales.add_row, shortcuts.addRow.command)}>
            <span>
              <IconButton aria-label={locales.add_row} disabled={editDisabled} onClick={() => void addRow()}>
                <CustomIcon type='plus' size='s' />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={locales.remove_row}>
            <span>
              <IconButton
                aria-label={locales.remove_row}
                disabled={editDisabled}
                onClick={() => void removeSelectedRows()}
              >
                <CustomIcon type='mines' size='s' />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={chordLabel(locales.save, shortcuts.saveGrid.command)}>
            <span>
              <IconButton
                aria-label={locales.save}
                data-testid='grid-save'
                disabled={editDisabled}
                onClick={() => void handleSave()}
              >
                <CustomIcon type='check' size='s' />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={chordLabel(locales.discard_changes, shortcuts.discardChanges.command)}>
            <span>
              <IconButton
                aria-label={locales.discard_changes}
                disabled={editDisabled}
                onClick={() => void discardChanges()}
              >
                <CustomIcon type='close' size='s' />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}

      <Tooltip
        title={
          isDataFetching
            ? chordLabel(locales.stop_query, shortcuts.cancelQuery.command)
            : chordLabel(locales.refresh, shortcuts.reloadTab.command)
        }
      >
        <span>
          <IconButton
            aria-label={isDataFetching ? locales.stop_query : locales.refresh}
            data-testid={isDataFetching ? 'stop-query' : 'refresh-query'}
            color={isDataFetching ? 'error' : 'default'}
            disabled={updateQueryPending}
            onClick={refreshOrStop}
          >
            <CustomIcon type={isDataFetching ? 'stop' : 'refresh'} size='s' />
          </IconButton>
        </span>
      </Tooltip>
    </StatusBarActionsStackStyled>
  );
}
