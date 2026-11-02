import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDashboardDialogStore } from '@/store/dashboardDialog/dashboardDialog.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Button } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

const FORM_ID = 'dashboard-name-form';

function NameForm({ onDone }: { onDone: () => void }): JSX.Element | null {
  const target = useDashboardDialogStore((state) => state.target);
  const connectionId = Number(useConnectionStore((state) => state.currentConnectionId));
  const addDashboardTab = useTabStore((state) => state.addDashboardTab);
  const queryClient = useQueryClient();
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
        sx={{ minWidth: 320 }}
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) mutate(name.trim());
        }}
      >
        <FieldInput
          autoFocus
          size='small'
          margin='none'
          placeholder={locales.dashboard_name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          inputProps={{ 'data-testid': 'dashboard-name-input', maxLength: 255 }}
        />
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
