import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import Modal from '@/components/base/Modal/Modal';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { Button, Checkbox, FormControlLabel, Stack } from '@mui/material';
import { type JSX, useEffect } from 'react';
import { useUnlockConnection } from '../useUnlockConnection';
import {
  ConnectionFormBodyStyled,
  ConnectionFormCheckboxRowStyled,
  ConnectionFormContainerStyled
} from './ConnectionPasswordPrompt.styled';

/**
 * The password dialog for layouts without the explorer sidebar (phone, tablet). On desktop the same
 * entry is inline (UnlockPanel) and nothing is cleared while the connection waits.
 */
export default function ConnectionPasswordPromptModal(): JSX.Element | null {
  const { showConnectionsRail } = useLayoutMode();
  const show = useSettingStore((s) => s.ui.showConnectionPasswordPrompt);
  const resetTree = useTreeStore((state) => state.reset);
  const clearCurrentConnection = useConnectionStore((state) => state.clearCurrentConnection);
  const unlock = useUnlockConnection(resetTree);

  useEffect(() => {
    if (show && !showConnectionsRail) clearCurrentConnection();
  }, [show, showConnectionsRail, clearCurrentConnection]);

  if (showConnectionsRail) return null;

  return (
    <Modal open={show} title={locales.password} onClose={unlock.close}>
      <ConnectionFormContainerStyled
        component='form'
        onSubmit={(e): void => {
          e.preventDefault();
          e.stopPropagation();
          void unlock.submit();
        }}
      >
        <ConnectionFormBodyStyled>
          <FieldInput
            name='password'
            value={unlock.password}
            label={locales.password}
            error={unlock.errors.length > 0}
            onChange={(e): void => unlock.setPassword(e.target.value)}
          />
          <FormError mb={0} errors={unlock.errors} />
          <ConnectionFormCheckboxRowStyled>
            <FormControlLabel
              control={
                <Checkbox
                  checked={unlock.rememberPassword}
                  size='small'
                  onChange={(e): void => unlock.setRememberPassword(e.target.checked)}
                />
              }
              label={locales.remember_password}
            />
          </ConnectionFormCheckboxRowStyled>
        </ConnectionFormBodyStyled>
        <ModalFooter spread>
          <Button
            type='button'
            data-testid='test-connection'
            loadingPosition='start'
            loading={unlock.testing}
            onClick={() => void unlock.test()}
            disabled={unlock.pending || unlock.errors.length > 0 || !unlock.connectionId}
            size='small'
            variant='outlined'
          >
            {locales.test}
          </Button>
          <Stack spacing={1} direction='row'>
            <Button type='button' size='small' onClick={unlock.close}>
              {locales.cancel}
            </Button>
            <Button
              type='submit'
              size='small'
              variant='contained'
              loading={unlock.pending}
              loadingPosition='start'
              disabled={unlock.pending || unlock.errors.length > 0 || !unlock.connectionId}
            >
              {locales.save}
            </Button>
          </Stack>
        </ModalFooter>
      </ConnectionFormContainerStyled>
    </Modal>
  );
}
