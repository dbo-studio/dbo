import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import type { ChartReport } from '@/components/common/AiChatPanel/utils/chartReport';
import { useSaveReport } from '@/components/common/AiChatPanel/hooks/useSaveReport';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, Button, Divider, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { toast } from 'sonner';

/** Pins a chart to a board, saving it as a report first when needed; a new board can be named in the menu. */
export default function PinReportButton({
  report,
  onSaved,
  icon
}: {
  report: ChartReport;
  onSaved?: (report: ChartReport) => void;
  /** Toolbar style: an icon button with a tooltip instead of a text button. */
  icon?: boolean;
}): JSX.Element {
  const queryClient = useQueryClient();
  const connectionId = Number(useConnectionStore((state) => state.currentConnectionId));
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [name, setName] = useState('');
  const { mutateAsync: save } = useSaveReport();
  const { data: boards } = useQuery({
    queryKey: ['dashboards', connectionId],
    queryFn: () => api.dashboard.getDashboards(connectionId),
    // Lists change behind this screen (the agent saves and pins), so a stale one reloads on open.
    refetchOnMount: true,
    enabled: !!anchorEl
  });

  const { mutate: pin } = useMutation({
    mutationFn: async (target: { id?: number; name: string }) => {
      const saved = report.questionId ? report : await save(report);
      onSaved?.(saved);
      const boardId = target.id ?? (await api.dashboard.createDashboard(connectionId, target.name)).id;
      return api.dashboard.pinToDashboard(boardId, saved.questionId as number);
    },
    onSuccess: async (board) => {
      setAnchorEl(null);
      setName('');
      toast.success(locales.ai_board_pinned.replace('{board}', board.name));
      await queryClient.invalidateQueries({ queryKey: ['dashboards'], refetchType: 'all' });
    }
  });

  return (
    <>
      {icon ? (
        <Tooltip title={locales.ai_board_pin}>
          <IconButton
            aria-label={locales.ai_board_pin}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            data-testid='ai-report-pin'
          >
            <CustomIcon type='pin' />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          size='small'
          variant='text'
          onClick={(event) => setAnchorEl(event.currentTarget)}
          data-testid='ai-report-pin'
        >
          {locales.ai_board_pin}
        </Button>
      )}
      <Menu open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}>
        {boards?.map((board) => (
          <MenuItem
            key={board.id}
            dense
            onClick={() => pin({ id: board.id, name: board.name })}
            data-testid='ai-pin-board'
          >
            {board.name}
          </MenuItem>
        ))}
        {(boards?.length ?? 0) > 0 && <Divider />}
        <Box
          component='form'
          sx={{ px: 1.5, py: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) pin({ name: name.trim() });
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <FieldInput
            size='small'
            margin='none'
            placeholder={locales.ai_board_name}
            value={name}
            onChange={(event) => setName(event.target.value)}
            inputProps={{ 'data-testid': 'ai-pin-new-board' }}
          />
          <Button size='small' type='submit' disabled={!name.trim()} data-testid='ai-pin-new-board-submit'>
            {locales.ai_board_new}
          </Button>
        </Box>
      </Menu>
    </>
  );
}
