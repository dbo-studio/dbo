import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import UnlockPanel from '@/components/common/Connections/UnlockPanel/UnlockPanel';
import { useConnectionLock } from '@/components/common/Connections/useUnlockConnection';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import locales from '@/locales';
import { Button, Popover, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { LockedBannerStyled } from './Container.styled';

/** Tells the open tabs why they cannot load: their connection is waiting for its password. */
export default function LockedBanner(): JSX.Element | null {
  const { showConnectionsRail } = useLayoutMode();
  const { locked } = useConnectionLock();
  const connection = useCurrentConnection();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  // Without the sidebar (phone, tablet) the password dialog does this job.
  if (!showConnectionsRail || !locked) return null;

  return (
    <LockedBannerStyled role='status' data-testid='connection-locked-banner'>
      <CustomIcon type='lock' size='s' />
      <Typography variant='caption' color='textText' sx={{ flex: 1 }}>
        {locales.connection_locked_banner.replace('{name}', connection?.name ?? '')}
      </Typography>
      <Button size='small' onClick={(event) => setAnchor(event.currentTarget)} data-testid='connection-locked-unlock'>
        {locales.connection_unlock}
      </Button>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { backgroundImage: 'none' } } }}
      >
        <UnlockPanel compact onDone={() => setAnchor(null)} />
      </Popover>
    </LockedBannerStyled>
  );
}
