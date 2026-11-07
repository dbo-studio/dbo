import api from '@/api';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDashboardDialogStore } from '@/store/dashboardDialog/dashboardDialog.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { Box, Button, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

const FORM_ID = 'dashboard-name-form';

function NameForm({ onDone }: { onDone: () => void }): JSX.Element | null {
  const target = useDashboardDialogStore((state) => state.target);
  const connectionId = Number(useConnectionStore((state) => state.currentConnectionId));
  const addDashboardTab = useTabStore((state) => state.addDashboardTab);
  const queryClient = useQueryClient();
  const connection = useCurrentConnection();
  const [name, setName] = useState(target?.mode === 'rename' ? target.name : '');

  const { mutate, isPending } = useMutation({
    mutationFn: (value: string) =>
      target?.mode === 'rename'
        ? api.dashboard.renameDashboard(target.id, value)
        : api.dashboard.createDashboard(connectionId, value),
    onSuccess: async (board) => {
      await queryClient.invalidateQueries({ queryKey: ['dashboards', connectionId], refetchType: 'all' });
      if (target?.mode === 'new') addDashboardTab(board);
      else useTabStore.getState().updateTabs(renameTabs(board.id, board.name));
      onDone();
    },
    onError: () => toast.error(locales.action_failed)
  });

  if (!target) return null;

  return (
    <Modal
      open
      compact
      onClose={onDone}
      title={target.mode === 'rename' ? locales.dashboard_rename : locales.dashboard_new}
      footer={
        <>
          <Button size='small' onClick={onDone}>
            {locales.cancel}
          </Button>
          <Button
            size='small'
            variant='contained'
            type='submit'
            form={FORM_ID}
            disabled={!name.trim() || isPending}
            data-testid='dashboard-name-submit'
          >
            {target.mode === 'rename' ? locales.dashboard_rename : locales.dashboard_create}
          </Button>
        </>
      }
    >
      <Box
        component='form'
        id={FORM_ID}
        sx={{ width: 420, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) mutate(name.trim());
        }}
      >
        <Typography variant='body2' color='textSubdued'>
          {target.mode === 'rename' ? locales.dashboard_rename_hint : locales.dashboard_new_hint}
        </Typography>
        <FieldInput
          autoFocus
          fullWidth
          margin='none'
          label={locales.dashboard_name}
          placeholder={locales.dashboard_name_placeholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          inputProps={{ 'data-testid': 'dashboard-name-input', maxLength: 255 }}
        />
        {connection && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <CustomIcon type={connection.type} size='s' />
            <Typography variant='caption' noWrap>
              {locales.dashboard_for_connection.replace('{name}', connection.name)}
            </Typography>
          </Box>
        )}
      </Box>
    </Modal>
  );
}

const renameTabs = (dashboardId: number, name: string) =>
  useTabStore
    .getState()
    .getTabs()
    .map((tab) => ('dashboardId' in tab && tab.dashboardId === dashboardId ? { ...tab, name } : tab));

export default function DashboardNameDialog(): JSX.Element | null {
  const target = useDashboardDialogStore((state) => state.target);
  const close = useDashboardDialogStore((state) => state.close);

  // Remounts per open so the field starts from the right name.
  return target ? <NameForm key={target.mode === 'rename' ? target.id : 'new'} onDone={close} /> : null;
}
