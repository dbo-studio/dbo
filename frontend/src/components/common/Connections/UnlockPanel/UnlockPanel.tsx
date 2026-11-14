import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import { TabMode } from '@/core/enums';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { Button, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useUnlockConnection } from '../useUnlockConnection';
import { UnlockActionsStyled, UnlockFormStyled, UnlockPanelStyled } from './UnlockPanel.styled';

/**
 * Password entry for a locked connection, shown in place instead of a dialog. Nothing was cleared
 * while it waited, so after unlocking the tree reloads where it was and a grid refreshes itself.
 */
export default function UnlockPanel({
  compact = false,
  onDone
}: {
  compact?: boolean;
  onDone?: () => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const reloadTree = useTreeStore((s) => s.reloadTree);

  const unlock = useUnlockConnection(async () => {
    await reloadTree(false);
    await queryClient.invalidateQueries({ queryKey: ['autocomplete'] });
    // A grid that failed for the password loads again. A query in an editor is the user's to run.
    if (useTabStore.getState().selectedTab()?.mode === TabMode.Data) useDataStore.getState().toggleReRunQuery();
    onDone?.();
  });

  return (
    <UnlockPanelStyled compact={compact} data-testid='connection-unlock-panel'>
      <CustomIcon type='lock' size={compact ? 'm' : 'l'} />
      <div>
        <Typography variant='subtitle2' color='textTitle'>
          {locales.connection_locked_title.replace('{name}', unlock.connection?.name ?? '')}
        </Typography>
        <Typography variant='caption' color='textSecondary' component='p'>
          {locales.connection_locked_hint}
        </Typography>
      </div>
      <UnlockFormStyled
        onSubmit={(event) => {
          event.preventDefault();
          void unlock.submit();
        }}
      >
        <FieldInput
          name='password'
          type='password'
          autoFocus
          value={unlock.password}
          placeholder={locales.password}
          error={unlock.errors.length > 0 && unlock.password !== ''}
          onChange={(event) => unlock.setPassword(event.target.value)}
          margin='none'
        />
        <FormError mb={0} errors={unlock.password === '' ? [] : unlock.errors} />
        <FormControlLabel
          label={locales.remember_password}
          control={
            <Checkbox
              size='small'
              checked={unlock.rememberPassword}
              onChange={(event) => unlock.setRememberPassword(event.target.checked)}
            />
          }
        />
        <UnlockActionsStyled>
          <Button
            type='button'
            variant='outlined'
            loading={unlock.testing}
            onClick={() => void unlock.test()}
            disabled={unlock.pending || unlock.errors.length > 0}
            data-testid='connection-unlock-test'
          >
            {locales.test}
          </Button>
          <Button
            type='submit'
            variant='contained'
            loading={unlock.pending && !unlock.testing}
            disabled={unlock.pending || unlock.errors.length > 0}
            data-testid='connection-unlock-submit'
          >
            {locales.connection_unlock}
          </Button>
        </UnlockActionsStyled>
      </UnlockFormStyled>
    </UnlockPanelStyled>
  );
}
